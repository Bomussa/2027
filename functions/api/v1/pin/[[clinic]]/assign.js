/**
 * PIN Assignment Endpoint (With Atomic Lock)
 * POST /api/v1/pin/:clinic/assign
 * Headers: Idempotency-Key (optional)
 */

const IDEMPOTENCY_TTL = 24 * 60 * 60; // 24 hours

/**
 * Acquire atomic lock for critical operations
 * @param {KVNamespace} kvLocks - KV namespace for locks
 * @param {string} key - Lock key
 * @param {number} ttl - Lock timeout in milliseconds
 * @returns {Promise<boolean>} - True if lock acquired
 */
const acquireLock = async (kvLocks, key, ttl = 10000) => {
  const lockKey = `lock:${key}`;
  const lockId = `${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
  const start = Date.now();
  
  while (Date.now() - start < ttl) {
    // Try to acquire lock
    const existing = await kvLocks.get(lockKey);
    
    if (!existing) {
      // No lock exists, try to set it
      await kvLocks.put(lockKey, lockId, { expirationTtl: 60 });
      
      // Verify we got the lock (double-check)
      await new Promise(r => setTimeout(r, 30));
      const verify = await kvLocks.get(lockKey);
      
      if (verify === lockId) {
        return lockId; // Lock acquired successfully
      }
    }
    
    // Lock exists or we didn't get it, wait and retry
    await new Promise(r => setTimeout(r, 50));
  }
  
  throw new Error("LOCK_TIMEOUT");
};

/**
 * Release atomic lock
 * @param {KVNamespace} kvLocks - KV namespace for locks
 * @param {string} key - Lock key
 */
const releaseLock = async (kvLocks, key, lockId) => {
  const lockKey = `lock:${key}`;
  
  // Only delete if we own the lock
  const existing = await kvLocks.get(lockKey);
  if (existing === lockId) {
    await kvLocks.delete(lockKey);
  }
};

export async function onRequestPost(context) {
  const { request, env, params } = context;
  
  try {
    const clinic = params.clinic?.[0];
    
    if (!clinic) {
      return jsonResponse({ error: 'Clinic name required' }, 400);
    }

    // Check for Idempotency-Key
    const idempotencyKey = request.headers.get('Idempotency-Key');
    
    if (idempotencyKey) {
      const cachedResponse = await env.KV_CACHE.get(`idempotency:${idempotencyKey}`, { type: 'json' });
      if (cachedResponse) {
        return jsonResponse({
          ...cachedResponse,
          from_cache: true
        }, 200);
      }
    }

    // Get current date in Qatar timezone
    const now = new Date();
    const qatarTime = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Qatar' }));
    const dateKey = qatarTime.toISOString().split('T')[0];

    // Acquire lock for atomic operation
    const lockKey = `${clinic}:${dateKey}`;
    const lockId = await acquireLock(env.KV_LOCKS || env.KV_CACHE, lockKey);

    try {
      // Get today's PINs state
      const pinsKey = `pins:${clinic}:${dateKey}`;
      let pinsData = await env.KV_PINS.get(pinsKey, { type: 'json' });

      // Initialize if not exists
      if (!pinsData) {
        pinsData = initializeDailyPins(dateKey);
      }

      // Try to pull PIN from available list
      let assignedPin = null;
      let reserveMode = false;

      if (pinsData.available.length > 0) {
        assignedPin = pinsData.available.shift();
      } else if (pinsData.reserve.length > 0) {
        assignedPin = pinsData.reserve.shift();
        reserveMode = true;
        pinsData.reserve_mode = true;
      } else {
        return jsonResponse({ 
          error: 'No PINs available',
          message: 'جميع الأرقام محجوزة لهذا اليوم'
        }, 503);
      }

      // Update data
      pinsData.taken.push(assignedPin);
      pinsData.issued += 1;
      pinsData.last_issued_at = new Date().toISOString();

      // Save updated data
      await env.KV_PINS.put(pinsKey, JSON.stringify(pinsData));

      // Generate session code (barcode)
      const sessionCode = generateSessionCode(clinic, assignedPin, dateKey);

      // Log event
      await logEvent(env.KV_EVENTS, {
        type: 'PIN_ASSIGNED',
        clinic: clinic,
        pin: assignedPin,
        session_code: sessionCode,
        date: dateKey,
        timestamp: new Date().toISOString(),
        reserve_mode: reserveMode,
        idempotency_key: idempotencyKey || null
      });

      // Prepare response
      const response = {
        success: true,
        pin: assignedPin,
        session_code: sessionCode,
        clinic: clinic,
        date: dateKey,
        reserve_mode: reserveMode,
        remaining: pinsData.available.length + pinsData.reserve.length,
        timestamp: new Date().toISOString()
      };

      // Cache response for idempotency
      if (idempotencyKey) {
        await env.KV_CACHE.put(
          `idempotency:${idempotencyKey}`,
          JSON.stringify(response),
          { expirationTtl: IDEMPOTENCY_TTL }
        );
      }

      return jsonResponse(response, 200);
    } finally {
      // Release lock
      await releaseLock(env.KV_LOCKS || env.KV_CACHE, lockKey, lockId);
    }

  } catch (error) {
    return jsonResponse({
      error: 'Internal server error',
      message: error.message
    }, 500);
  }
}

function generateSessionCode(clinic, pin, date) {
  // Format: MMC-CLINIC_CODE-PIN-YYMMDD
  const clinicCode = clinic.substring(0, 3).toUpperCase();
  const dateCode = date.replace(/-/g, '').substring(2); // YYMMDD
  return `MMC-${clinicCode}-${pin}-${dateCode}`;
}

function initializeDailyPins(date) {
  const available = [];
  const reserve = [];

  // Generate PINs 01-20 (available)
  for (let i = 1; i <= 20; i++) {
    available.push(String(i).padStart(2, '0'));
  }

  // Generate PINs 21-30 (reserve)
  for (let i = 21; i <= 30; i++) {
    reserve.push(String(i).padStart(2, '0'));
  }

  return {
    date: date,
    available: available,
    reserve: reserve,
    taken: [],
    issued: 0,
    reserve_mode: false,
    last_issued_at: null,
    created_at: new Date().toISOString()
  };
}

async function logEvent(kvEvents, event) {
  try {
    const eventId = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const eventKey = `event:${event.type}:${eventId}`;
    
    await kvEvents.put(eventKey, JSON.stringify(event), {
      expirationTtl: 30 * 24 * 60 * 60 // 30 days
    });
  } catch (error) {
    console.error('Failed to log event:', error);
  }
}

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data, null, 2), {
    status: status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, Idempotency-Key'
    }
  });
}


/**
 * PIN Assignment Endpoint (Counter-Based with Atomic Lock)
 * POST /api/v1/pin/:clinic/assign
 * Headers: Idempotency-Key (optional)
 */

const IDEMPOTENCY_TTL = 24 * 60 * 60; // 24 hours
const MAX_PINS = 30; // Maximum PINs per day per clinic
const RESERVE_THRESHOLD = 20; // When to switch to reserve mode

/**
 * Acquire atomic lock for critical operations
 * @param {KVNamespace} kvLocks - KV namespace for locks
 * @param {string} key - Lock key
 * @param {number} ttl - Lock timeout in milliseconds
 * @returns {Promise<string>} - Lock ID if acquired
 */
const acquireLock = async (kvLocks, key, ttl = 20000) => {
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
 * @param {string} lockId - Lock ID to verify ownership
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
      // Get current counter
      const counterKey = `counter:${clinic}:${dateKey}`;
      let counter = await env.KV_PINS.get(counterKey);
      
      if (!counter) {
        counter = 0;
      } else {
        counter = parseInt(counter, 10);
      }

      // Check if we've reached the limit
      if (counter >= MAX_PINS) {
        return jsonResponse({ 
          error: 'No PINs available',
          message: 'جميع الأرقام محجوزة لهذا اليوم'
        }, 503);
      }

      // Increment counter
      counter += 1;
      
      // Format PIN (01, 02, ..., 30)
      const assignedPin = counter.toString().padStart(2, '0');
      
      // Determine reserve mode
      const reserveMode = counter > RESERVE_THRESHOLD;

      // Save new counter value
      await env.KV_PINS.put(counterKey, counter.toString());

      // Save PIN metadata
      const pinMetaKey = `pin:${clinic}:${dateKey}:${assignedPin}`;
      await env.KV_PINS.put(pinMetaKey, JSON.stringify({
        pin: assignedPin,
        issued_at: new Date().toISOString(),
        reserve_mode: reserveMode,
        idempotency_key: idempotencyKey || null
      }), { expirationTtl: 86400 }); // 24 hours

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
        remaining: MAX_PINS - counter,
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

async function logEvent(kvEvents, event) {
  try {
    const eventKey = `event:${event.type}:${Date.now()}:${Math.random().toString(36).substring(2, 9)}`;
    await kvEvents.put(eventKey, JSON.stringify(event), { expirationTtl: 604800 }); // 7 days
  } catch (e) {
    console.error('Failed to log event:', e);
  }
}

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, Idempotency-Key'
    }
  });
}


/**
 * PIN Assignment Endpoint (Enhanced with Atomic Locks & Idempotency)
 * POST /api/v1/pin/:clinic/assign
 * Headers: Idempotency-Key (optional)
 */

const MAX_RETRY_ATTEMPTS = 5;
const LOCK_TTL = 10; // seconds
const IDEMPOTENCY_TTL = 24 * 60 * 60; // 24 hours

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

    // Atomic PIN assignment with retry logic
    let assignedPin = null;
    let pinsData = null;
    let attempt = 0;

    while (attempt < MAX_RETRY_ATTEMPTS && !assignedPin) {
      attempt++;

      // Try to acquire lock
      const lockKey = `lock:pins:${clinic}:${dateKey}`;
      const lockAcquired = await acquireLock(env.KV_LOCKS, lockKey, LOCK_TTL);

      if (!lockAcquired) {
        // Wait and retry
        await sleep(100 * attempt); // Exponential backoff
        continue;
      }

      try {
        // Get today's PINs state
        const pinsKey = `pins:${clinic}:${dateKey}`;
        pinsData = await env.KV_PINS.get(pinsKey, { type: 'json' });

        // Initialize if not exists
        if (!pinsData) {
          pinsData = initializeDailyPins(dateKey);
        }

        // Try to pull PIN from available list
        if (pinsData.available.length > 0) {
          assignedPin = pinsData.available.shift();
        } else if (pinsData.reserve.length > 0) {
          assignedPin = pinsData.reserve.shift();
          pinsData.reserve_mode = true;
        } else {
          await releaseLock(env.KV_LOCKS, lockKey);
          return jsonResponse({ 
            error: 'No PINs available',
            message: 'جميع الأرقام محجوزة لهذا اليوم'
          }, 503);
        }

        // Update data
        pinsData.taken.push(assignedPin);
        pinsData.issued += 1;
        pinsData.last_issued_at = new Date().toISOString();

        // Save updated data atomically
        await env.KV_PINS.put(pinsKey, JSON.stringify(pinsData));

      } finally {
        // Always release lock
        await releaseLock(env.KV_LOCKS, lockKey);
      }
    }

    if (!assignedPin) {
      return jsonResponse({ 
        error: 'Failed to assign PIN after retries',
        message: 'فشل في تخصيص الرقم بعد عدة محاولات'
      }, 500);
    }

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
      reserve_mode: pinsData.reserve_mode,
      idempotency_key: idempotencyKey || null
    });

    // Prepare response
    const response = {
      success: true,
      pin: assignedPin,
      session_code: sessionCode,
      clinic: clinic,
      date: dateKey,
      reserve_mode: pinsData.reserve_mode,
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

  } catch (error) {
    return jsonResponse({ 
      error: error.message,
      timestamp: new Date().toISOString()
    }, 500);
  }
}

async function acquireLock(kvLocks, lockKey, ttl) {
  const lockValue = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  try {
    // Try to set lock only if it doesn't exist
    const existing = await kvLocks.get(lockKey);
    
    if (existing) {
      // Check if lock is expired
      const lockData = JSON.parse(existing);
      const lockAge = (Date.now() - lockData.timestamp) / 1000;
      
      if (lockAge < ttl) {
        return false; // Lock still held
      }
    }

    // Acquire lock
    await kvLocks.put(lockKey, JSON.stringify({
      value: lockValue,
      timestamp: Date.now()
    }), {
      expirationTtl: ttl
    });

    return true;
  } catch {
    return false;
  }
}

async function releaseLock(kvLocks, lockKey) {
  try {
    await kvLocks.delete(lockKey);
  } catch (error) {
    console.error('Failed to release lock:', error);
  }
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
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
  
  for (let i = 1; i <= 20; i++) {
    available.push(String(i).padStart(2, '0'));
  }
  
  for (let i = 21; i <= 30; i++) {
    reserve.push(String(i).padStart(2, '0'));
  }

  return {
    available,
    reserve,
    taken: [],
    issued: 0,
    reserve_mode: false,
    reset_at: new Date(date + 'T00:00:00+03:00').toISOString(),
    last_issued_at: null,
    tz: 'Asia/Qatar'
  };
}

async function logEvent(kvEvents, event) {
  try {
    const eventKey = `event:${Date.now()}:${Math.random().toString(36).substr(2, 9)}`;
    await kvEvents.put(eventKey, JSON.stringify(event), {
      expirationTtl: 7 * 24 * 60 * 60
    });
  } catch (error) {
    console.error('Event logging failed:', error);
  }
}

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Cache-Control': 'no-cache, no-store, must-revalidate'
    }
  });
}


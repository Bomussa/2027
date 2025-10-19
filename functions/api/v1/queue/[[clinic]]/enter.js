/**
 * Queue Enter Endpoint (With Atomic Lock)
 * POST /api/v1/queue/:clinic/enter
 * Body: { pin: "01" }
 */

/**
 * Acquire atomic lock for critical operations
 * @param {KVNamespace} kvLocks - KV namespace for locks
 * @param {string} key - Lock key
 * @param {number} ttl - Lock timeout in milliseconds
 * @returns {Promise<boolean>} - True if lock acquired
 */
const acquireLock = async (kvLocks, key, ttl = 3000) => {
  const lockKey = `lock:${key}`;
  const start = Date.now();
  while (Date.now() - start < ttl) {
    const acquired = await kvLocks.put(lockKey, "1", { expirationTtl: 60, nx: true });
    if (acquired === null) return true; // Lock acquired
    await new Promise(r => setTimeout(r, 100));
  }
  throw new Error("LOCK_TIMEOUT");
};

/**
 * Release atomic lock
 * @param {KVNamespace} kvLocks - KV namespace for locks
 * @param {string} key - Lock key
 */
const releaseLock = async (kvLocks, key) => {
  const lockKey = `lock:${key}`;
  await kvLocks.delete(lockKey);
};

export async function onRequestPost(context) {
  const { request, env, params } = context;
  
  try {
    const clinic = params.clinic?.[0];
    
    if (!clinic) {
      return jsonResponse({ error: 'Clinic name required' }, 400);
    }

    // Parse request body
    const body = await request.json();
    const pin = body.pin;

    if (!pin) {
      return jsonResponse({ error: 'PIN required' }, 400);
    }

    // Get current date in Qatar timezone
    const now = new Date();
    const qatarTime = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Qatar' }));
    const dateKey = qatarTime.toISOString().split('T')[0];

    // Verify PIN exists for this clinic and date
    const pinsKey = `pins:${clinic}:${dateKey}`;
    const pinsData = await env.KV_PINS.get(pinsKey, { type: 'json' });

    if (!pinsData || !pinsData.taken || !pinsData.taken.includes(pin)) {
      return jsonResponse({
        error: 'Invalid PIN',
        message: 'الرقم غير صالح أو لم يتم إصداره'
      }, 400);
    }

    // Acquire lock for atomic operation
    const lockKey = `queue:${clinic}:${dateKey}`;
    await acquireLock(env.KV_LOCKS || env.KV_CACHE, lockKey);

    try {
      // Get queue state
      const queueKey = `queue:${clinic}:${dateKey}`;
      let queueData = await env.KV_QUEUES.get(queueKey, { type: 'json' });

      // Initialize if not exists
      if (!queueData) {
        queueData = initializeQueue(clinic, dateKey);
      }

      // Ensure entries array exists
      if (!queueData.entries) {
        queueData.entries = [];
      }

      // Check if PIN already in queue
      const existingEntry = queueData.entries.find(e => e.pin === pin);
      if (existingEntry) {
        return jsonResponse({
          error: 'PIN already in queue',
          message: 'الرقم موجود بالفعل في قائمة الانتظار',
          position: existingEntry.position,
          status: existingEntry.status
        }, 409);
      }

      // Generate session code
      const sessionCode = generateSessionCode(clinic, pin, dateKey);

      // Add to queue
      const position = queueData.entries.length + 1;
      const entry = {
        pin: pin,
        session_code: sessionCode,
        position: position,
        status: 'WAITING',
        entered_at: new Date().toISOString(),
        called_at: null,
        served_at: null,
        wait_seconds: 0
      };

      queueData.entries.push(entry);
      queueData.queue_length = queueData.entries.filter(e => e.status === 'WAITING').length;
      queueData.last_updated = new Date().toISOString();

      // Save updated queue
      await env.KV_QUEUES.put(queueKey, JSON.stringify(queueData));

      // Log event
      await logEvent(env.KV_EVENTS, {
        type: 'QUEUE_ENTER',
        clinic: clinic,
        pin: pin,
        session_code: sessionCode,
        position: position,
        date: dateKey,
        timestamp: new Date().toISOString()
      });

      // Prepare response
      const response = {
        success: true,
        clinic: clinic,
        pin: pin,
        session_code: sessionCode,
        position: position,
        status: 'WAITING',
        queue_length: queueData.queue_length,
        timestamp: new Date().toISOString()
      };

      return jsonResponse(response, 200);
    } finally {
      // Release lock
      await releaseLock(env.KV_LOCKS || env.KV_CACHE, lockKey);
    }

  } catch (error) {
    return jsonResponse({
      error: 'Internal server error',
      message: error.message
    }, 500);
  }
}

function generateSessionCode(clinic, pin, date) {
  const clinicCode = clinic.substring(0, 3).toUpperCase();
  const dateCode = date.replace(/-/g, '').substring(2);
  return `MMC-${clinicCode}-${pin}-${dateCode}`;
}

function initializeQueue(clinic, date) {
  return {
    clinic: clinic,
    date: date,
    entries: [],
    queue_length: 0,
    current_pin: null,
    next_pin: null,
    total_served: 0,
    avg_wait_seconds: 0,
    created_at: new Date().toISOString(),
    last_updated: new Date().toISOString()
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


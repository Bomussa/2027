/**
 * Queue Enter Endpoint (Enhanced with session_code and NEAR_TURN)
 * POST /api/v1/queue/:clinic/enter
 * Body: { pin?, session_code? }
 */

export async function onRequestPost(context) {
  const { request, env, params } = context;
  
  try {
    const clinic = params.clinic?.[0];
    
    if (!clinic) {
      return jsonResponse({ error: 'Clinic name required' }, 400);
    }

    const body = await request.json().catch(() => ({}));
    let pin = body.pin;
    let sessionCode = body.session_code;

    const now = new Date();
    const qatarTime = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Qatar' }));
    const dateKey = qatarTime.toISOString().split('T')[0];

    // If session_code provided, extract PIN from it
    if (sessionCode && !pin) {
      const extracted = extractPinFromSessionCode(sessionCode);
      if (extracted) {
        pin = extracted;
      }
    }

    // If no PIN provided, assign one automatically
    if (!pin) {
      const assignResult = await assignPinAutomatically(env, clinic, dateKey);
      if (!assignResult.success) {
        return jsonResponse({ error: assignResult.error }, 503);
      }
      pin = assignResult.pin;
      sessionCode = assignResult.session_code;
    }

    // Get queue data with lock
    const queueKey = `queue:${clinic}:${dateKey}`;
    const lockKey = `lock:queue:${clinic}:${dateKey}`;
    
    // Acquire lock
    const lockAcquired = await acquireLock(env.KV_LOCKS, lockKey, 10);
    if (!lockAcquired) {
      return jsonResponse({ error: 'Queue is busy, please retry' }, 503);
    }

    try {
      let queueData = await env.KV_QUEUES.get(queueKey, { type: 'json' });

      if (!queueData) {
        queueData = {
          clinic: clinic,
          date: dateKey,
          queue: [],
          current_pin: null,
          next_pin: null,
          in_service: 0,
          capacity: 1,
          avg_wait_seconds: 0
        };
      }

      // Check if PIN already in queue
      const existing = queueData.queue.find(item => item.pin === pin);
      if (existing) {
        await releaseLock(env.KV_LOCKS, lockKey);
        
        const position = queueData.queue.filter(item => 
          item.status === 'WAITING' && 
          queueData.queue.indexOf(item) < queueData.queue.indexOf(existing)
        ).length + 1;
        
        return jsonResponse({
          error: 'PIN already in queue',
          message: 'الرقم موجود بالفعل في الطابور',
          position: position,
          status: existing.status
        }, 409);
      }

      // Add to queue
      const queueItem = {
        pin: pin,
        session_code: sessionCode || generateSessionCode(clinic, pin, dateKey),
        status: 'WAITING',
        entered_at: new Date().toISOString(),
        called_at: null,
        done_at: null
      };

      queueData.queue.push(queueItem);

      // Update NEAR_TURN status for positions 1-3
      updateNearTurnStatus(queueData);

      // Save queue data
      await env.KV_QUEUES.put(queueKey, JSON.stringify(queueData));

    } finally {
      await releaseLock(env.KV_LOCKS, lockKey);
    }

    // Calculate position
    const queueData = await env.KV_QUEUES.get(queueKey, { type: 'json' });
    const waitingQueue = queueData.queue.filter(item => item.status === 'WAITING');
    const position = waitingQueue.findIndex(item => item.pin === pin) + 1;
    const isNearTurn = position <= 3;

    // Log event
    await logEvent(env.KV_EVENTS, {
      type: 'QUEUE_ENTERED',
      clinic: clinic,
      pin: pin,
      session_code: sessionCode,
      date: dateKey,
      position: position,
      near_turn: isNearTurn,
      timestamp: new Date().toISOString()
    });

    // Send NEAR_TURN notification if applicable
    if (isNearTurn) {
      await sendNearTurnNotification(env, clinic, pin, position);
    }

    return jsonResponse({
      success: true,
      clinic: clinic,
      pin: pin,
      session_code: sessionCode || generateSessionCode(clinic, pin, dateKey),
      position: position,
      status: isNearTurn ? 'NEAR_TURN' : 'WAITING',
      queue_length: waitingQueue.length,
      estimated_wait_minutes: Math.ceil(position * (queueData.avg_wait_seconds || 600) / 60),
      timestamp: new Date().toISOString()
    }, 200);

  } catch (error) {
    return jsonResponse({ error: error.message }, 500);
  }
}

function updateNearTurnStatus(queueData) {
  const waitingQueue = queueData.queue.filter(item => item.status === 'WAITING');
  
  waitingQueue.forEach((item, index) => {
    if (index < 3) {
      item.status = 'NEAR_TURN';
    } else if (item.status === 'NEAR_TURN') {
      item.status = 'WAITING';
    }
  });
}

async function sendNearTurnNotification(env, clinic, pin, position) {
  try {
    const notification = {
      type: 'NEAR_TURN',
      clinic: clinic,
      pin: pin,
      position: position,
      message: `اقترب دورك في ${clinic}. موقعك: ${position}`,
      timestamp: new Date().toISOString()
    };

    const notifyKey = `notify:${clinic}:${pin}:${Date.now()}`;
    await env.KV_EVENTS.put(notifyKey, JSON.stringify(notification), {
      expirationTtl: 24 * 60 * 60
    });
  } catch (error) {
    console.error('Failed to send NEAR_TURN notification:', error);
  }
}

function extractPinFromSessionCode(sessionCode) {
  // Format: MMC-XXX-PIN-YYMMDD
  const parts = sessionCode.split('-');
  if (parts.length >= 3) {
    return parts[2];
  }
  return null;
}

function generateSessionCode(clinic, pin, date) {
  const clinicCode = clinic.substring(0, 3).toUpperCase();
  const dateCode = date.replace(/-/g, '').substring(2);
  return `MMC-${clinicCode}-${pin}-${dateCode}`;
}

async function assignPinAutomatically(env, clinic, dateKey) {
  const pinsKey = `pins:${clinic}:${dateKey}`;
  let pinsData = await env.KV_PINS.get(pinsKey, { type: 'json' });

  if (!pinsData) {
    pinsData = initializeDailyPins(dateKey);
  }

  let assignedPin = null;
  
  if (pinsData.available.length > 0) {
    assignedPin = pinsData.available.shift();
  } else if (pinsData.reserve.length > 0) {
    assignedPin = pinsData.reserve.shift();
    pinsData.reserve_mode = true;
  } else {
    return { success: false, error: 'No PINs available' };
  }

  pinsData.taken.push(assignedPin);
  pinsData.issued += 1;

  await env.KV_PINS.put(pinsKey, JSON.stringify(pinsData));

  const sessionCode = generateSessionCode(clinic, assignedPin, dateKey);

  return { success: true, pin: assignedPin, session_code: sessionCode };
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
    tz: 'Asia/Qatar'
  };
}

async function acquireLock(kvLocks, lockKey, ttl) {
  try {
    const existing = await kvLocks.get(lockKey);
    if (existing) {
      const lockData = JSON.parse(existing);
      const lockAge = (Date.now() - lockData.timestamp) / 1000;
      if (lockAge < ttl) return false;
    }

    await kvLocks.put(lockKey, JSON.stringify({
      timestamp: Date.now()
    }), { expirationTtl: ttl });

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


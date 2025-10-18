/**
 * Queue Enter Endpoint
 * POST /api/v1/queue/:clinic/enter
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

    const now = new Date();
    const qatarTime = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Qatar' }));
    const dateKey = qatarTime.toISOString().split('T')[0];

    // If no PIN provided, assign one automatically
    if (!pin) {
      const assignResult = await assignPinAutomatically(env, clinic, dateKey);
      if (!assignResult.success) {
        return jsonResponse({ error: assignResult.error }, 503);
      }
      pin = assignResult.pin;
    }

    // Get queue data
    const queueKey = `queue:${clinic}:${dateKey}`;
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
      return jsonResponse({
        error: 'PIN already in queue',
        position: queueData.queue.indexOf(existing) + 1
      }, 409);
    }

    // Add to queue
    const queueItem = {
      pin: pin,
      status: 'WAITING',
      entered_at: new Date().toISOString(),
      called_at: null,
      done_at: null
    };

    queueData.queue.push(queueItem);

    // Save queue data
    await env.KV_QUEUES.put(queueKey, JSON.stringify(queueData));

    // Log event
    await logEvent(env.KV_EVENTS, {
      type: 'QUEUE_ENTERED',
      clinic: clinic,
      pin: pin,
      date: dateKey,
      position: queueData.queue.length,
      timestamp: new Date().toISOString()
    });

    return jsonResponse({
      success: true,
      clinic: clinic,
      pin: pin,
      position: queueData.queue.length,
      queue_length: queueData.queue.length,
      estimated_wait_minutes: Math.ceil(queueData.queue.length * (queueData.avg_wait_seconds || 600) / 60),
      timestamp: new Date().toISOString()
    }, 200);

  } catch (error) {
    return jsonResponse({ error: error.message }, 500);
  }
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

  return { success: true, pin: assignedPin };
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


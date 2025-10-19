/**
 * PIN Reset Endpoint
 * POST /api/v1/pin/:clinic/reset
 * Resets daily PINs for a specific clinic (Admin only)
 */

export async function onRequestPost(context) {
  const { request, env, params } = context;
  
  try {
    const clinic = params.clinic?.[0];
    
    if (!clinic) {
      return jsonResponse({ error: 'Clinic name required' }, 400);
    }

    // TODO: Add authentication check for admin
    // For now, we'll allow reset but log it

    const now = new Date();
    const qatarTime = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Qatar' }));
    const dateKey = qatarTime.toISOString().split('T')[0];

    // Initialize fresh PINs
    const pinsData = initializeDailyPins(dateKey);

    // Save to KV
    const pinsKey = `pins:${clinic}:${dateKey}`;
    await env.KV_PINS.put(pinsKey, JSON.stringify(pinsData));

    // Also reset the queue for this clinic
    const queueKey = `queue:${clinic}:${dateKey}`;
    const freshQueue = {
      clinic: clinic,
      date: dateKey,
      queue: [],
      current_pin: null,
      next_pin: null,
      in_service: 0,
      capacity: 1,
      avg_wait_seconds: 0
    };
    await env.KV_QUEUES.put(queueKey, JSON.stringify(freshQueue));

    // Log RESET_DONE event
    await logEvent(env.KV_EVENTS, {
      type: 'RESET_DONE',
      clinic: clinic,
      date: dateKey,
      timestamp: new Date().toISOString()
    });

    return jsonResponse({
      success: true,
      clinic: clinic,
      date: dateKey,
      pins_reset: true,
      queue_reset: true,
      available_pins: pinsData.available.length,
      reserve_pins: pinsData.reserve.length,
      timestamp: new Date().toISOString()
    }, 200);

  } catch (error) {
    return jsonResponse({ error: error.message }, 500);
  }
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
    const eventKey = `event:${event.clinic}:reset:${Date.now()}`;
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


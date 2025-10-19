/**
 * PIN Status Endpoint (Enhanced with Reset action)
 * GET /api/v1/pin/:clinic/status - Get PIN status
 * GET /api/v1/pin/:clinic/status?action=reset - Reset PINs for the day
 */

export async function onRequestGet(context) {
  const { request, env, params } = context;
  
  try {
    const clinic = params.clinic?.[0];
    
    if (!clinic) {
      return jsonResponse({ error: 'Clinic name required' }, 400);
    }

    const url = new URL(request.url);
    const action = url.searchParams.get('action');

    const now = new Date();
    const qatarTime = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Qatar' }));
    const dateKey = qatarTime.toISOString().split('T')[0];

    const pinsKey = `pins:${clinic}:${dateKey}`;

    // Handle reset action
    if (action === 'reset') {
      return await handleReset(env, clinic, dateKey, pinsKey);
    }

    // Default: Return status
    let pinsData = await env.KV_PINS.get(pinsKey, { type: 'json' });

    if (!pinsData) {
      return jsonResponse({
        clinic: clinic,
        date: dateKey,
        initialized: false,
        available: 20,
        reserve: 10,
        taken: 0,
        issued: 0,
        reserve_mode: false
      }, 200);
    }

    return jsonResponse({
      clinic: clinic,
      date: dateKey,
      initialized: true,
      available: pinsData.available.length,
      reserve: pinsData.reserve.length,
      taken: pinsData.taken.length,
      issued: pinsData.issued,
      reserve_mode: pinsData.reserve_mode,
      reset_at: pinsData.reset_at,
      pins_list: {
        available: pinsData.available,
        reserve: pinsData.reserve,
        taken: pinsData.taken
      }
    }, 200);

  } catch (error) {
    return jsonResponse({ error: error.message }, 500);
  }
}

async function handleReset(env, clinic, dateKey, pinsKey) {
  // Initialize new PINs
  const pinsData = initializeDailyPins(dateKey);
  
  // Save
  await env.KV_PINS.put(pinsKey, JSON.stringify(pinsData));

  // Also reset queue for this clinic
  const queueKey = `queue:${clinic}:${dateKey}`;
  const queueData = {
    clinic: clinic,
    date: dateKey,
    entries: [],
    queue_length: 0,
    current_pin: null,
    next_pin: null,
    total_served: 0,
    avg_wait_seconds: 0,
    created_at: new Date().toISOString(),
    last_updated: new Date().toISOString()
  };
  await env.KV_QUEUES.put(queueKey, JSON.stringify(queueData));

  // Log event
  await logEvent(env.KV_EVENTS, {
    type: 'PIN_RESET',
    clinic: clinic,
    date: dateKey,
    timestamp: new Date().toISOString()
  });

  return jsonResponse({
    success: true,
    action: 'reset',
    clinic: clinic,
    date: dateKey,
    available: pinsData.available.length,
    reserve: pinsData.reserve.length,
    timestamp: new Date().toISOString()
  }, 200);
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
    reset_at: new Date().toISOString(),
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
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Cache-Control': 'no-cache, no-store, must-revalidate'
    }
  });
}


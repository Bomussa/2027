/**
 * PIN Status Endpoint (Counter-Based)
 * GET /api/v1/pin/:clinic/status - Get PIN status
 * GET /api/v1/pin/:clinic/status?action=reset - Reset PINs for the day
 */

const MAX_PINS = 30;
const RESERVE_THRESHOLD = 20;

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

    // Handle reset action
    if (action === 'reset') {
      return await handleReset(env, clinic, dateKey);
    }

    // Default: Return status
    const counterKey = `counter:${clinic}:${dateKey}`;
    let counter = await env.KV_PINS.get(counterKey);
    
    if (!counter) {
      counter = 0;
    } else {
      counter = parseInt(counter, 10);
    }

    // Calculate available, reserve, and taken
    const issued = counter;
    const taken = counter;
    const available = Math.max(0, RESERVE_THRESHOLD - counter);
    const reserve = Math.max(0, MAX_PINS - Math.max(counter, RESERVE_THRESHOLD));
    const reserveMode = counter >= RESERVE_THRESHOLD;

    // Get list of taken PINs
    const takenList = [];
    for (let i = 1; i <= counter; i++) {
      takenList.push(i.toString().padStart(2, '0'));
    }

    // Get list of available PINs
    const availableList = [];
    for (let i = counter + 1; i <= Math.min(counter + available, RESERVE_THRESHOLD); i++) {
      availableList.push(i.toString().padStart(2, '0'));
    }

    // Get list of reserve PINs
    const reserveList = [];
    for (let i = RESERVE_THRESHOLD + 1; i <= MAX_PINS; i++) {
      if (i > counter) {
        reserveList.push(i.toString().padStart(2, '0'));
      }
    }

    return jsonResponse({
      clinic: clinic,
      date: dateKey,
      initialized: counter > 0,
      available: available,
      reserve: reserve,
      taken: taken,
      issued: issued,
      reserve_mode: reserveMode,
      pins_list: {
        available: availableList,
        reserve: reserveList,
        taken: takenList
      }
    }, 200);

  } catch (error) {
    return jsonResponse({ error: error.message }, 500);
  }
}

async function handleReset(env, clinic, dateKey) {
  // Reset counter to 0
  const counterKey = `counter:${clinic}:${dateKey}`;
  await env.KV_PINS.put(counterKey, '0');

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
    available: RESERVE_THRESHOLD,
    reserve: MAX_PINS - RESERVE_THRESHOLD,
    timestamp: new Date().toISOString()
  }, 200);
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


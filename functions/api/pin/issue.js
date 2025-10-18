/**
 * PIN Issue Endpoint
 * POST /api/pin/issue
 * Body: { clinicId, visitId? }
 */

export async function onRequestPost(context) {
  const { request, env } = context;
  
  try {
    const body = await request.json().catch(() => ({}));
    const { clinicId, visitId } = body;
    
    if (!clinicId) {
      return jsonResponse({ error: 'clinicId required' }, 400);
    }

    // Get current date in Qatar timezone
    const now = new Date();
    const qatarTime = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Qatar' }));
    const dateKey = qatarTime.toISOString().split('T')[0];

    // Get today's PINs state
    const pinsKey = `pins:${clinicId}:${dateKey}`;
    let pinsData = await env.KV_PINS.get(pinsKey, { type: 'json' });

    // Initialize if not exists
    if (!pinsData) {
      pinsData = initializeDailyPins(dateKey);
    }

    // Try to pull PIN from available list
    let assignedPin = null;
    
    if (pinsData.available.length > 0) {
      assignedPin = pinsData.available.shift();
    } else if (pinsData.reserve.length > 0) {
      assignedPin = pinsData.reserve.shift();
      pinsData.reserve_mode = true;
    } else {
      return jsonResponse({ 
        ok: false,
        error: 'No PINs available'
      }, 503);
    }

    // Update data
    pinsData.taken.push(assignedPin);
    pinsData.issued += 1;

    // Save updated data
    await env.KV_PINS.put(pinsKey, JSON.stringify(pinsData));

    // Log event
    await logEvent(env.KV_EVENTS, {
      type: 'PIN_ISSUED',
      clinicId: clinicId,
      pin: assignedPin,
      visitId: visitId,
      dateKey: dateKey,
      timestamp: new Date().toISOString()
    });

    // Response
    return jsonResponse({
      ok: true,
      pin: assignedPin,
      dateKey: dateKey,
      clinicId: clinicId
    }, 200);

  } catch (error) {
    return jsonResponse({ 
      ok: false,
      error: error.message
    }, 500);
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


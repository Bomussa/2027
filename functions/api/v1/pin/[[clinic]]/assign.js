/**
 * PIN Assignment Endpoint (Simplified & Working)
 * POST /api/v1/pin/:clinic/assign
 * Headers: Idempotency-Key (optional)
 */

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
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, Idempotency-Key'
    }
  });
}


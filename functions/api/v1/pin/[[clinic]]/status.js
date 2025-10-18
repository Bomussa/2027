/**
 * PIN Status Endpoint
 * GET /api/v1/pin/:clinic/status
 */

export async function onRequestGet(context) {
  const { env, params } = context;
  
  try {
    const clinic = params.clinic?.[0];
    
    if (!clinic) {
      return jsonResponse({ error: 'Clinic name required' }, 400);
    }

    const now = new Date();
    const qatarTime = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Qatar' }));
    const dateKey = qatarTime.toISOString().split('T')[0];

    const pinsKey = `pins:${clinic}:${dateKey}`;
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


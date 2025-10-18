/**
 * PIN Current Endpoint
 * GET /api/pin/current/:clinicId
 */

export async function onRequestGet(context) {
  const { env, params } = context;
  
  try {
    const clinicId = params.clinicId?.[0];
    
    if (!clinicId) {
      return jsonResponse({ ok: false, error: 'clinicId required' }, 400);
    }

    const now = new Date();
    const qatarTime = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Qatar' }));
    const dateKey = qatarTime.toISOString().split('T')[0];

    const pinsKey = `pins:${clinicId}:${dateKey}`;
    let pinsData = await env.KV_PINS.get(pinsKey, { type: 'json' });

    if (!pinsData) {
      return jsonResponse({
        ok: true,
        clinicId: clinicId,
        dateKey: dateKey,
        currentPin: null,
        totalIssued: 0,
        allPins: []
      }, 200);
    }

    // Current PIN is the last issued one
    const currentPin = pinsData.taken.length > 0 
      ? pinsData.taken[pinsData.taken.length - 1] 
      : null;

    return jsonResponse({
      ok: true,
      clinicId: clinicId,
      dateKey: dateKey,
      currentPin: currentPin,
      totalIssued: pinsData.issued,
      allPins: pinsData.taken,
      available: pinsData.available.length,
      reserve: pinsData.reserve.length
    }, 200);

  } catch (error) {
    return jsonResponse({ 
      ok: false,
      error: error.message 
    }, 500);
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


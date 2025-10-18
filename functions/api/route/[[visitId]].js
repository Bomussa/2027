/**
 * Route Get Endpoint
 * GET /api/route/:visitId
 */

export async function onRequestGet(context) {
  const { env, params } = context;
  
  try {
    const visitId = params.visitId?.[0];
    
    if (!visitId) {
      return jsonResponse({ ok: false, error: 'visitId required' }, 400);
    }

    const routeKey = `route:${visitId}`;
    const routeData = await env.KV_ADMIN.get(routeKey, { type: 'json' });

    if (!routeData) {
      return jsonResponse({
        ok: false,
        error: 'Route not found'
      }, 404);
    }

    return jsonResponse({
      ok: true,
      route: routeData
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


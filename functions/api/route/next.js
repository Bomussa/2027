/**
 * Route Next Endpoint
 * POST /api/route/next
 * Body: { visitId, currentClinicId }
 */

export async function onRequestPost(context) {
  const { request, env } = context;
  
  try {
    const body = await request.json().catch(() => ({}));
    const { visitId, currentClinicId } = body;
    
    if (!visitId || !currentClinicId) {
      return jsonResponse({ 
        ok: false,
        error: 'visitId and currentClinicId required' 
      }, 400);
    }

    const routeKey = `route:${visitId}`;
    let routeData = await env.KV_ADMIN.get(routeKey, { type: 'json' });

    if (!routeData) {
      return jsonResponse({
        ok: false,
        error: 'Route not found'
      }, 404);
    }

    // Mark current clinic as completed
    if (!routeData.completedClinics.includes(currentClinicId)) {
      routeData.completedClinics.push(currentClinicId);
    }

    // Remove from pending
    routeData.pendingClinics = routeData.pendingClinics.filter(c => c !== currentClinicId);

    // Move to next step
    routeData.currentStep += 1;

    if (routeData.currentStep >= routeData.route.length) {
      // Journey completed
      routeData.status = 'COMPLETED';
      routeData.currentClinic = null;
      routeData.completedAt = new Date().toISOString();
    } else {
      // Move to next clinic
      routeData.currentClinic = routeData.route[routeData.currentStep];
    }

    routeData.updatedAt = new Date().toISOString();

    // Save
    await env.KV_ADMIN.put(routeKey, JSON.stringify(routeData));

    // Log event
    await logEvent(env.KV_EVENTS, {
      type: 'ROUTE_STEP_COMPLETED',
      visitId: visitId,
      completedClinic: currentClinicId,
      nextClinic: routeData.currentClinic,
      status: routeData.status,
      timestamp: new Date().toISOString()
    });

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


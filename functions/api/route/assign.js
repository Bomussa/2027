/**
 * Route Assign Endpoint
 * POST /api/route/assign
 * Body: { visitId, examType, gender }
 */

export async function onRequestPost(context) {
  const { request, env } = context;
  
  try {
    const body = await request.json().catch(() => ({}));
    const { visitId, examType, gender } = body;
    
    if (!visitId || !examType) {
      return jsonResponse({ 
        ok: false,
        error: 'visitId and examType required' 
      }, 400);
    }

    // Get clinics configuration
    const clinicsConfig = await env.KV_ADMIN.get('clinics:config', { type: 'json' });
    
    if (!clinicsConfig || !clinicsConfig.clinics) {
      return jsonResponse({
        ok: false,
        error: 'Clinics configuration not found'
      }, 500);
    }

    // Determine route based on exam type
    let route = [];
    
    // Common route for all exams
    const commonClinics = ['LAB', 'XR']; // المختبر والأشعة
    
    // Add specific clinics based on exam type
    if (examType.includes('عام') || examType.includes('General')) {
      route = [...commonClinics, 'BIO', 'ECG', 'INT']; // القياسات، القلب، الباطنية
    } else if (examType.includes('خاص') || examType.includes('Special')) {
      route = [...commonClinics, 'BIO', 'ECG', 'EYE', 'ENT', 'INT']; // + العيون والأنف
    } else {
      // Default route
      route = [...commonClinics, 'BIO', 'INT'];
    }

    // Create route object
    const routeData = {
      visitId: visitId,
      examType: examType,
      gender: gender || 'M',
      route: route,
      currentStep: 0,
      currentClinic: route[0],
      status: 'IN_PROGRESS',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      completedClinics: [],
      pendingClinics: route
    };

    // Save route
    const routeKey = `route:${visitId}`;
    await env.KV_ADMIN.put(routeKey, JSON.stringify(routeData));

    // Log event
    await logEvent(env.KV_EVENTS, {
      type: 'ROUTE_ASSIGNED',
      visitId: visitId,
      examType: examType,
      route: route,
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


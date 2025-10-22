// Create and save patient route
// POST /api/v1/route/create
// Body: { patientId, examType, gender, stations }

import { jsonResponse, corsResponse, validateRequiredFields, checkKVAvailability } from '../../../_shared/utils.js';

export async function onRequest(context) {
  const { request, env } = context;
  
  if (request.method !== 'POST') {
    return jsonResponse({ success: false, error: 'Method not allowed' }, 405);
  }
  
  try {
    const body = await request.json();
    const { patientId, examType, gender, stations } = body;
    
    // Validate required fields
    const validationError = validateRequiredFields(body, ['patientId', 'examType', 'gender', 'stations']);
    if (validationError) {
      return jsonResponse(validationError, 400);
    }
    
    // Check KV availability
    const kvError = checkKVAvailability(env.KV_ADMIN, 'KV_ADMIN');
    if (kvError) {
      return jsonResponse(kvError, 500);
    }
    
    const kv = env.KV_ADMIN;
    const routeKey = `route:${patientId}`;
    
    // Check if route already exists
    const existingRoute = await kv.get(routeKey, 'json');
    
    if (existingRoute) {
      // Return existing route (sticky)
      return jsonResponse({
        success: true,
        route: existingRoute,
        sticky: true,
        message: 'Route already exists'
      });
    }
    
    // Create new route
    const route = {
      patientId,
      examType,
      gender,
      stations,
      currentStep: 0,
      createdAt: new Date().toISOString(),
      status: 'active'
    };
    
    // Save route to KV
    await kv.put(routeKey, JSON.stringify(route), {
      expirationTtl: 86400 // 24 hours
    });
    
    return jsonResponse({
      success: true,
      route: route,
      message: 'Route created successfully'
    });
    
  } catch (error) {
    return jsonResponse({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    }, 500);
  }
}

// Handle OPTIONS for CORS
export async function onRequestOptions() {
  return corsResponse(['POST', 'OPTIONS']);
}


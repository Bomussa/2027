// Call Next Patient - Admin calls next number every 2 minutes

import { jsonResponse, corsResponse, validateRequiredFields, checkKVAvailability } from '../../../_shared/utils.js';

export async function onRequest(context) {
  const { request, env } = context;
  
  if (request.method !== 'POST') {
    return jsonResponse({ success: false, error: 'Method not allowed' }, 405);
  }
  
  try {
    const body = await request.json();
    const { clinic } = body;
    
    // Validate required fields
    const validationError = validateRequiredFields(body, ['clinic']);
    if (validationError) {
      return jsonResponse(validationError, 400);
    }
    
    // Check KV availability
    const kvError = checkKVAvailability(env.KV_QUEUES, 'KV_QUEUES');
    if (kvError) {
      return jsonResponse(kvError, 500);
    }
    
    const kv = env.KV_QUEUES;
    
    // Get queue list
    const listKey = `queue:list:${clinic}`;
    const queueList = await kv.get(listKey, 'json') || [];
    
    if (queueList.length === 0) {
      return jsonResponse({
        success: true,
        clinic: clinic,
        current_number: null,
        message: 'No patients waiting'
      });
    }
    
    // Get first patient
    const nextPatient = queueList[0];
    
    // Save current number
    const currentKey = `queue:current:${clinic}`;
    await kv.put(currentKey, JSON.stringify({
      number: nextPatient.number,
      user: nextPatient.user,
      called_at: new Date().toISOString()
    }), {
      expirationTtl: 86400
    });
    
    return jsonResponse({
      success: true,
      clinic: clinic,
      current_number: nextPatient.number,
      total_waiting: queueList.length
    });
    
  } catch (error) {
    return jsonResponse({ 
      success: false, 
      error: error.message,
      timestamp: new Date().toISOString()
    }, 500);
  }
}

export async function onRequestOptions() {
  return corsResponse(['POST', 'OPTIONS']);
}


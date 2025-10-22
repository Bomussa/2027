// Queue Done - Exit from clinic with PIN verification

import { jsonResponse, corsResponse, validateRequiredFields, checkKVAvailability } from '../../../_shared/utils.js';

export async function onRequest(context) {
  const { request, env } = context;
  
  if (request.method !== 'POST') {
    return jsonResponse({ success: false, error: 'Method not allowed' }, 405);
  }
  
  try {
    const body = await request.json();
    const { clinic, user, pin } = body;
    
    // Validate required fields
    const validationError = validateRequiredFields(body, ['clinic', 'user', 'pin']);
    if (validationError) {
      return jsonResponse(validationError, 400);
    }
    
    // Check KV availability
    const kvError = checkKVAvailability(env.KV_QUEUES, 'KV_QUEUES');
    if (kvError) {
      return jsonResponse(kvError, 500);
    }
    
    const kv = env.KV_QUEUES;
    
    // Get daily PINs
    const today = new Date().toISOString().split('T')[0];
    const pinsKey = `pins:daily:${today}`;
    const dailyPins = await kv.get(pinsKey, 'json');
    
    if (!dailyPins) {
      return jsonResponse({ success: false, error: 'Daily PINs not found' }, 404);
    }
    
    // Verify PIN
    const correctPin = dailyPins[clinic];
    if (!correctPin) {
      return jsonResponse({ success: false, error: 'PIN not found for this clinic' }, 404);
    }
    
    if (String(pin) !== String(correctPin)) {
      return jsonResponse({ 
        success: false, 
        error: 'رقم PIN غير صحيح',
        message: 'Incorrect PIN'
      }, 400);
    }
    
    // Get user entry
    const userKey = `queue:user:${clinic}:${user}`;
    const userEntry = await kv.get(userKey, 'json');
    
    if (!userEntry) {
      return jsonResponse({ success: false, error: 'User not in queue' }, 404);
    }
    
    // Calculate duration
    const now = new Date();
    const exitTime = now.toISOString();
    const entryTime = new Date(userEntry.entry_time);
    const durationMs = now - entryTime;
    const durationMinutes = Math.round(durationMs / 60000);
    
    // Update user status to DONE
    userEntry.status = 'DONE';
    userEntry.exit_time = exitTime;
    userEntry.duration_minutes = durationMinutes;
    
    await kv.put(userKey, JSON.stringify(userEntry), {
      expirationTtl: 86400
    });
    
    // Remove from queue list
    const listKey = `queue:list:${clinic}`;
    let queueList = await kv.get(listKey, 'json') || [];
    
    queueList = queueList.filter(item => item.user !== user);
    
    await kv.put(listKey, JSON.stringify(queueList), {
      expirationTtl: 86400
    });
    
    return jsonResponse({
      success: true,
      clinic: clinic,
      user: user,
      status: 'DONE',
      exit_time: exitTime,
      duration_minutes: durationMinutes,
      remaining_in_queue: queueList.length
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


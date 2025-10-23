// Queue Enter - Simple and Accurate
// Each clinic has independent queue starting from 1

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

    // Check KV_PINS availability
    const kvPinsError = checkKVAvailability(env.KV_PINS, 'KV_PINS');
    if (kvPinsError) {
      return jsonResponse(kvPinsError, 500);
    }

    // Get daily PINs from KV_PINS
    const today = new Date().toISOString().split('T')[0];
    const pinsKey = `pins:daily:${today}`;
    const dailyPins = await env.KV_PINS.get(pinsKey, 'json');

    if (!dailyPins) {
      return jsonResponse({ success: false, error: 'Daily PINs not found' }, 404);
    }

    // Verify PIN - MUST match the specific clinic's PIN only
    const clinicPinData = dailyPins[clinic];

    // Check if clinic exists in daily PINs
    if (!clinicPinData) {
      return jsonResponse({ 
        success: false, 
        error: 'لم يتم العثور على PIN لهذه العيادة',
        message: 'PIN not found for this clinic' 
      }, 404);
    }

    // Extract PIN from object or use directly if string
    const correctPin = typeof clinicPinData === 'object' ? clinicPinData.pin : clinicPinData;

    // Strict PIN validation - must match exactly
    const normalizedInputPin = String(pin).trim();
    const normalizedCorrectPin = String(correctPin).trim();

    if (normalizedInputPin !== normalizedCorrectPin) {
      return jsonResponse({ 
        success: false, 
        error: 'رقم PIN غير صحيح. يجب إدخال رقم PIN الخاص بهذه العيادة فقط',
        message: 'Incorrect PIN. You must enter the PIN assigned to this specific clinic only',
        clinic: clinic
      }, 403);
    }

    // Additional security check: verify PIN belongs to this clinic only
    // This is a redundant check since we already verified against the clinic's PIN, but it adds an extra layer of clarity.
    for (const [otherClinic, otherPinData] of Object.entries(dailyPins)) {
      if (otherClinic !== clinic) {
        const otherPin = typeof otherPinData === 'object' ? otherPinData.pin : otherPinData;
        if (String(otherPin).trim() === normalizedInputPin) {
          // Although the PIN matches the requested clinic, if it also matches another clinic, 
          // it might indicate a configuration issue or an attempt to use a known PIN.
          // For now, we rely on the direct match above, but keep this logic for future security enhancements if needed.
          // The primary goal is to ensure the PIN is correct for the requested clinic.
        }
      }
    }

    // End PIN verification logic
    
    // Check KV availability
    const kvError = checkKVAvailability(env.KV_QUEUES, 'KV_QUEUES');
    if (kvError) {
      return jsonResponse(kvError, 500);
    }
    
    const kv = env.KV_QUEUES;
    const now = new Date();
    const entryTime = now.toISOString();
    
    // Get current queue list for this clinic
    const listKey = `queue:list:${clinic}`;
    let queueList = await kv.get(listKey, 'json') || [];
    
    // Check if user already in queue
    const existingIndex = queueList.findIndex(item => item.user === user);
    if (existingIndex !== -1) {
      // User already in queue - return existing position
      const existing = queueList[existingIndex];
      const position = existingIndex + 1;
      
      return jsonResponse({
        success: true,
        clinic: clinic,
        user: user,
        number: existing.number,
        status: 'WAITING',
        display_number: position,
        ahead: position - 1,
        total_waiting: queueList.length,
        entry_time: existing.entered_at,
        message: 'Already in queue'
      });
    }
    
    // Assign new queue number (sequential for this clinic)
    const newNumber = queueList.length + 1;
    
    // Add to queue list
    const queueEntry = {
      number: newNumber,
      user: user,
      entered_at: entryTime,
      status: 'WAITING'
    };
    
    queueList.push(queueEntry);
    
    // Save queue list
    await kv.put(listKey, JSON.stringify(queueList), {
      expirationTtl: 86400
    });
    
    // Save user entry
    const userKey = `queue:user:${clinic}:${user}`;
    const userEntry = {
      pin: pin,
      number: newNumber,
      status: 'WAITING',
      entered_at: entryTime,
      entry_time: entryTime,
      user: user,
      clinic: clinic
    };
    
    await kv.put(userKey, JSON.stringify(userEntry), {
      expirationTtl: 86400
    });
    
    // Calculate position
    const myPosition = queueList.length;
    const ahead = myPosition - 1;
    const totalWaiting = queueList.length;
    
    return jsonResponse({
      success: true,
      clinic: clinic,
      user: user,
      number: newNumber,
      status: 'WAITING',
      display_number: myPosition,
      ahead: ahead,
      total_waiting: totalWaiting,
      entry_time: entryTime
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


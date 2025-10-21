// Queue Done - Exit from clinic with PIN verification

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Access-Control-Allow-Origin': '*',
      'Cache-Control': 'no-cache, no-store, must-revalidate'
    }
  });
}

export async function onRequest(context) {
  const { request, env } = context;
  
  if (request.method !== 'POST') {
    return jsonResponse({ success: false, error: 'Method not allowed' }, 405);
  }
  
  try {
    const body = await request.json();
    const { clinic, user, pin } = body;
    
    if (!clinic || !user || !pin) {
      return jsonResponse({ success: false, error: 'Missing required fields' }, 400);
    }
    
    const kv = env.KV_QUEUES;
    if (!kv) {
      return jsonResponse({ success: false, error: 'KV not available' }, 500);
    }
    
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
    
    console.log(`✅ Queue Exit: ${clinic} - User ${user} - Duration: ${durationMinutes}min`);
    
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
    console.error('Queue done error:', error);
    return jsonResponse({ success: false, error: error.message }, 500);
  }
}

// Handle OPTIONS for CORS
export async function onRequestOptions() {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Max-Age': '86400'
    }
  });
}


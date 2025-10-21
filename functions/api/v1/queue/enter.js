// Queue Enter - Simple and Accurate
// Each clinic has independent queue starting from 1

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
    const { clinic, user } = body;
    
    if (!clinic || !user) {
      return jsonResponse({ success: false, error: 'Missing clinic or user' }, 400);
    }
    
    const kv = env.KV_QUEUES;
    if (!kv) {
      return jsonResponse({ success: false, error: 'KV not available' }, 500);
    }
    
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
    
    console.log(`✅ Queue Entry: ${clinic} - User ${user} - Position ${myPosition}`);
    
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
    console.error('Queue enter error:', error);
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


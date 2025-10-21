// Call Next Patient - Admin calls next number every 2 minutes

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
    const { clinic } = body;
    
    if (!clinic) {
      return jsonResponse({ success: false, error: 'Missing clinic' }, 400);
    }
    
    const kv = env.KV_QUEUES;
    if (!kv) {
      return jsonResponse({ success: false, error: 'KV not available' }, 500);
    }
    
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
    console.error('Call next error:', error);
    return jsonResponse({ success: false, error: error.message }, 500);
  }
}

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


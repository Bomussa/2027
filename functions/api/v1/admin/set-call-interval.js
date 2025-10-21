// Admin: Set call interval for auto-calling patients

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
    const { clinic, interval_minutes } = body;
    
    if (!clinic || !interval_minutes) {
      return jsonResponse({ success: false, error: 'Missing clinic or interval' }, 400);
    }
    
    const kv = env.KV_QUEUES;
    if (!kv) {
      return jsonResponse({ success: false, error: 'KV not available' }, 500);
    }
    
    // Save interval setting
    const intervalKey = `queue:interval:${clinic}`;
    await kv.put(intervalKey, JSON.stringify({
      interval_minutes: interval_minutes,
      updated_at: new Date().toISOString()
    }), {
      expirationTtl: 86400 * 30 // 30 days
    });
    
    return jsonResponse({
      success: true,
      clinic: clinic,
      interval_minutes: interval_minutes,
      message: `Call interval set to ${interval_minutes} minutes`
    });
    
  } catch (error) {
    console.error('Set interval error:', error);
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


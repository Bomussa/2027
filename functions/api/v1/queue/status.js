// Queue Status - Get current queue status for a clinic
// Returns current serving number, total length, and waiting count

export async function onRequest(context) {
  const { request, env } = context;
  
  if (request.method !== 'GET') {
    return new Response(JSON.stringify({
      success: false,
      error: 'Method not allowed'
    }), {
      status: 405,
      headers: { 'Content-Type': 'application/json; charset=utf-8' }
    });
  }
  
  try {
    const url = new URL(request.url);
    const clinic = url.searchParams.get('clinic');
    
    if (!clinic) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Missing clinic parameter'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json; charset=utf-8' }
      });
    }
    
    const kv = env.KV_QUEUES;
    
    // Get queue status with cache bypass
    const statusKey = `queue:status:${clinic}`;
    const status = await kv.get(statusKey, { type: 'json', cacheTtl: 0 }) || { current: 0, length: 0 };
    
    // Get counter with cache bypass
    const counterKey = `queue:counter:${clinic}`;
    const counter = await kv.get(counterKey, { type: 'text', cacheTtl: 0 });
    const total = counter ? parseInt(counter) : 0;
    
    return new Response(JSON.stringify({
      success: true,
      clinic: clinic,
      current: status.current || 0,
      length: total,
      waiting: Math.max(0, total - (status.current || 0))
    }), {
      status: 200,
      headers: { 
        'Content-Type': 'application/json; charset=utf-8',
        'Cache-Control': 'no-cache, no-store, must-revalidate'
      }
    });
    
  } catch (error) {
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json; charset=utf-8' }
    });
  }
}


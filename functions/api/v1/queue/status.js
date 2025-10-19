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
    
    // Get queue status
    const statusKey = `queue:status:${clinic}`;
    const statusData = await kv.get(statusKey, { type: 'json' });
    const status = statusData || { current: null, served: [] };
    
    // Ensure served array exists
    if (!status.served) {
      status.served = [];
    }
    
    // Get queue list
    const listKey = `queue:list:${clinic}`;
    const queueList = await kv.get(listKey, { type: 'json' }) || [];
    
    // Calculate waiting
    let waiting = 0;
    if (status.current) {
      waiting = queueList.filter(item => item.number > status.current).length;
    } else {
      waiting = queueList.length;
    }
    
    return new Response(JSON.stringify({
      success: true,
      clinic: clinic,
      current: status.current,
      current_display: status.served.length + 1,
      length: queueList.length,
      waiting: waiting
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


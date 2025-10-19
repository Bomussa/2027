// Queue Status - Get current queue status for a clinic
// Uses Durable Object for consistent state

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
    
    // Get Durable Object instance for this clinic
    const id = env.QUEUE_DO.idFromName(clinic);
    const stub = env.QUEUE_DO.get(id);
    
    // Forward request to Durable Object
    const doRequest = new Request(`https://do/${clinic}/status`, {
      method: 'GET'
    });
    
    const doResponse = await stub.fetch(doRequest);
    const data = await doResponse.json();
    
    // Return response with clinic info
    return new Response(JSON.stringify({
      ...data,
      clinic: clinic
    }), {
      status: doResponse.status,
      headers: { 
        'Content-Type': 'application/json; charset=utf-8',
        'Cache-Control': 'no-cache'
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


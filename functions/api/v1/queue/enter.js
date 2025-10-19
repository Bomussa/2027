// Queue Enter - Assign queue number to patient
// Uses Durable Object for atomic counter increment
// Each clinic has independent queue starting from 1

export async function onRequest(context) {
  const { request, env } = context;
  
  if (request.method !== 'POST') {
    return new Response(JSON.stringify({
      success: false,
      error: 'Method not allowed'
    }), {
      status: 405,
      headers: { 'Content-Type': 'application/json; charset=utf-8' }
    });
  }
  
  try {
    const body = await request.json();
    const { clinic, user } = body;
    
    if (!clinic || !user) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Missing clinic or user'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json; charset=utf-8' }
      });
    }
    
    // Get Durable Object instance for this clinic
    const id = env.QUEUE_DO.idFromName(clinic);
    const stub = env.QUEUE_DO.get(id);
    
    // Forward request to Durable Object
    const doRequest = new Request(`https://do/${clinic}/enter`, {
      method: 'POST',
      body: JSON.stringify({ clinic, user }),
      headers: { 'Content-Type': 'application/json' }
    });
    
    const doResponse = await stub.fetch(doRequest);
    const data = await doResponse.json();
    
    // Return response with clinic info
    return new Response(JSON.stringify({
      ...data,
      clinic: clinic
    }), {
      status: doResponse.status,
      headers: { 'Content-Type': 'application/json; charset=utf-8' }
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


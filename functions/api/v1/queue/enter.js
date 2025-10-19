// Queue Enter - Assign queue number to patient
// Simple counter increment with retry
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
    
    const kv = env.KV_QUEUES;
    const counterKey = `queue:counter:${clinic}`;
    const statusKey = `queue:status:${clinic}`;
    const userKey = `queue:user:${clinic}:${user}`;
    
    // Get and increment counter
    const counterStr = await kv.get(counterKey, { type: 'text' });
    const currentCounter = counterStr ? parseInt(counterStr) : 0;
    const newNumber = currentCounter + 1;
    
    // Update counter immediately
    await kv.put(counterKey, newNumber.toString(), {
      expirationTtl: 86400,
      metadata: { updated: Date.now(), by: user }
    });
    
    // Store user entry
    await kv.put(userKey, JSON.stringify({
      number: newNumber,
      status: 'WAITING',
      entered_at: new Date().toISOString(),
      user: user,
      clinic: clinic
    }), {
      expirationTtl: 86400
    });
    
    // Get current status for "ahead" calculation
    const status = await kv.get(statusKey, { type: 'json' }) || { current: 0 };
    const ahead = Math.max(0, newNumber - (status.current || 0) - 1);
    
    return new Response(JSON.stringify({
      success: true,
      clinic: clinic,
      user: user,
      number: newNumber,
      status: 'WAITING',
      ahead: ahead
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


// Queue Enter - Assign queue number to patient
// Optimistic concurrency control without locks
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
    
    // Retry logic with exponential backoff
    let attempts = 0;
    const maxAttempts = 10;
    
    while (attempts < maxAttempts) {
      attempts++;
      
      try {
        // Generate unique number using timestamp + random
        const timestamp = Date.now();
        const random = Math.floor(Math.random() * 10000);
        const uniqueId = `${timestamp}-${random}`;
        
        // Get current counter with cache bypass
        const counterStr = await kv.get(counterKey, { type: 'text', cacheTtl: 0 });
        const currentCounter = counterStr ? parseInt(counterStr) : 0;
        const newNumber = currentCounter + 1;
        
        // Try to claim this number by storing user entry first
        const userEntry = {
          number: newNumber,
          status: 'WAITING',
          entered_at: new Date().toISOString(),
          user: user,
          clinic: clinic,
          unique_id: uniqueId,
          attempt: attempts
        };
        
        // Store user entry
        await kv.put(userKey, JSON.stringify(userEntry), {
          expirationTtl: 86400
        });
        
        // Small delay for propagation
        await new Promise(resolve => setTimeout(resolve, 30 + Math.random() * 20));
        
        // Verify our entry is stored
        const verify = await kv.get(userKey, { type: 'json', cacheTtl: 0 });
        if (!verify || verify.unique_id !== uniqueId) {
          // Our write was overwritten, retry
          const backoff = Math.min(1000, 50 * Math.pow(1.5, attempts));
          await new Promise(resolve => setTimeout(resolve, backoff + Math.random() * 50));
          continue;
        }
        
        // Update counter
        await kv.put(counterKey, newNumber.toString(), {
          expirationTtl: 86400,
          metadata: { updated: Date.now(), by: user, attempt: attempts }
        });
        
        // Get current status for "ahead" calculation
        const status = await kv.get(statusKey, { type: 'json', cacheTtl: 0 }) || { current: 0 };
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
        // Retry on error
        const backoff = Math.min(1000, 50 * Math.pow(1.5, attempts));
        await new Promise(resolve => setTimeout(resolve, backoff + Math.random() * 50));
        continue;
      }
    }
    
    // Failed after all attempts
    return new Response(JSON.stringify({
      success: false,
      error: 'System busy, please try again'
    }), {
      status: 503,
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


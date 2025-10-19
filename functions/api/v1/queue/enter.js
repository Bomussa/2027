// Queue Enter - Assign queue number to patient
// Enhanced atomic lock mechanism with exponential backoff
// Each clinic has independent queue starting from 1

// Generate unique lock ID
function generateLockId() {
  const timestamp = Date.now();
  const random1 = Math.random().toString(36).substr(2, 12);
  const random2 = Math.random().toString(36).substr(2, 9);
  return `${timestamp}-${random1}-${random2}`;
}

// Enhanced atomic lock with cache bypass and exponential backoff
async function acquireLock(kv, lockKey, lockId, timeout = 30000) {
  const startTime = Date.now();
  let attempts = 0;
  
  while (Date.now() - startTime < timeout) {
    attempts++;
    
    try {
      // Try to get existing lock with cache bypass
      const existingLock = await kv.get(lockKey, { 
        type: 'text',
        cacheTtl: 0 // Force bypass cache
      });
      
      // Check if lock exists and is still valid
      if (existingLock && existingLock !== lockId) {
        // Parse lock metadata to check expiry
        const lockMeta = await kv.getWithMetadata(lockKey, { type: 'text', cacheTtl: 0 });
        if (lockMeta.metadata && lockMeta.metadata.acquired) {
          const lockAge = Date.now() - lockMeta.metadata.acquired;
          // If lock is older than 20 seconds, consider it stale
          if (lockAge > 20000) {
            // Try to break stale lock
            await kv.delete(lockKey);
          } else {
            // Lock is fresh, wait with exponential backoff
            const backoff = Math.min(2000, 100 * Math.pow(1.5, attempts % 8)) + Math.random() * 100;
            await new Promise(resolve => setTimeout(resolve, backoff));
            continue;
          }
        }
      }
      
      // Try to acquire lock
      await kv.put(lockKey, lockId, {
        expirationTtl: 30, // Shorter TTL
        metadata: { 
          acquired: Date.now(), 
          id: lockId,
          attempt: attempts,
          pid: Math.random().toString(36).substr(2, 9)
        }
      });
      
      // Wait longer to ensure propagation (critical for consistency)
      await new Promise(resolve => setTimeout(resolve, 200 + Math.random() * 100));
      
      // Verify we got the lock with cache bypass
      const currentLock = await kv.get(lockKey, { 
        type: 'text',
        cacheTtl: 0
      });
      
      if (currentLock === lockId) {
        // Double verification after additional delay
        await new Promise(resolve => setTimeout(resolve, 100));
        const finalCheck = await kv.get(lockKey, { type: 'text', cacheTtl: 0 });
        if (finalCheck === lockId) {
          return true;
        }
      }
      
    } catch (e) {
      console.error('Lock acquisition error:', e);
    }
    
    // Exponential backoff with jitter
    const backoff = Math.min(2000, 50 * Math.pow(2, attempts % 6)) + Math.random() * 100;
    await new Promise(resolve => setTimeout(resolve, backoff));
  }
  
  return false;
}

// Release lock
async function releaseLock(kv, lockKey, lockId) {
  try {
    const currentLock = await kv.get(lockKey, { type: 'text', cacheTtl: 0 });
    if (currentLock === lockId) {
      await kv.delete(lockKey);
    }
  } catch (e) {
    // Ignore errors
  }
}

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
    const lockKey = `lock:queue:${clinic}`;
    const counterKey = `queue:counter:${clinic}`;
    const statusKey = `queue:status:${clinic}`;
    const userKey = `queue:user:${clinic}:${user}`;
    
    // Generate unique lock ID
    const lockId = generateLockId();
    
    // Try to acquire lock
    const lockAcquired = await acquireLock(kv, lockKey, lockId, 30000);
    
    if (!lockAcquired) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Failed to acquire lock - system busy, please retry'
      }), {
        status: 503,
        headers: { 'Content-Type': 'application/json; charset=utf-8' }
      });
    }
    
    try {
      // Get current counter with cache bypass
      const counterStr = await kv.get(counterKey, { type: 'text', cacheTtl: 0 });
      const counter = counterStr ? parseInt(counterStr) : 0;
      const newNumber = counter + 1;
      
      // Update counter
      await kv.put(counterKey, newNumber.toString(), {
        expirationTtl: 86400,
        metadata: { updated: Date.now(), by: user }
      });
      
      // Store user queue entry
      await kv.put(userKey, JSON.stringify({
        number: newNumber,
        status: 'WAITING',
        entered_at: new Date().toISOString(),
        user: user,
        clinic: clinic
      }), {
        expirationTtl: 86400
      });
      
      // Get current status
      const status = await kv.get(statusKey, { type: 'json', cacheTtl: 0 }) || { current: 0 };
      const ahead = Math.max(0, newNumber - (status.current || 0) - 1);
      
      // Release lock
      await releaseLock(kv, lockKey, lockId);
      
      return new Response(JSON.stringify({
        success: true,
        clinic: clinic,
        user: user,
        number: newNumber,
        status: 'WAITING',
        ahead: ahead
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json; charset=utf-8' }
      });
      
    } catch (error) {
      // Release lock on error
      await releaseLock(kv, lockKey, lockId);
      throw error;
    }
    
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


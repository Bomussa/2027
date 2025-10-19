// Queue Enter - Assign queue number to patient
// Each clinic has independent queue starting from 1
// Queue numbers are separate from PIN system

import { getKV } from '../../../lib/kv.js';

// Atomic lock helpers
function generateLockId() {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

async function acquireLock(kv, lockKey, lockId, timeout = 20000) {
  const startTime = Date.now();
  
  while (Date.now() - startTime < timeout) {
    try {
      await kv.put(lockKey, lockId, {
        expirationTtl: 60,
        metadata: { acquired: Date.now(), id: lockId }
      });
      
      await new Promise(resolve => setTimeout(resolve, 50));
      
      const currentLock = await kv.get(lockKey, { type: 'text' });
      if (currentLock === lockId) {
        return true;
      }
    } catch (e) {
      // Continue trying
    }
    
    await new Promise(resolve => setTimeout(resolve, 50));
  }
  
  return false;
}

async function releaseLock(kv, lockKey, lockId) {
  try {
    const currentLock = await kv.get(lockKey, { type: 'text' });
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
    
    const kv = getKV(env);
    const lockKey = `lock:queue:${clinic}`;
    const lockId = generateLockId();
    
    // Acquire lock
    const acquired = await acquireLock(kv, lockKey, lockId);
    if (!acquired) {
      return new Response(JSON.stringify({
        success: false,
        error: 'LOCK_TIMEOUT'
      }), {
        status: 408,
        headers: { 'Content-Type': 'application/json; charset=utf-8' }
      });
    }
    
    try {
      // Get current counter
      const counterKey = `queue:counter:${clinic}`;
      const currentCounter = await kv.get(counterKey, 'text');
      const nextNumber = currentCounter ? parseInt(currentCounter) + 1 : 1;
      
      // Update counter
      await kv.put(counterKey, String(nextNumber), {
        expirationTtl: 86400 // 24 hours
      });
      
      // Store user's queue number
      const userKey = `queue:user:${clinic}:${user}`;
      await kv.put(userKey, JSON.stringify({
        number: nextNumber,
        status: 'WAITING',
        entered_at: new Date().toISOString()
      }), {
        expirationTtl: 86400
      });
      
      // Get queue status
      const statusKey = `queue:status:${clinic}`;
      const status = await kv.get(statusKey, 'json') || { current: 0, length: 0 };
      status.length = nextNumber;
      
      await kv.put(statusKey, JSON.stringify(status), {
        expirationTtl: 86400
      });
      
      return new Response(JSON.stringify({
        success: true,
        clinic: clinic,
        user: user,
        number: nextNumber,
        status: 'WAITING',
        ahead: Math.max(0, nextNumber - (status.current || 0) - 1)
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json; charset=utf-8' }
      });
      
    } finally {
      await releaseLock(kv, lockKey, lockId);
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


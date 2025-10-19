// Queue Status - Get current queue status for a clinic
// Returns current serving number, total length, and waiting count

import { getKV } from '../../../lib/kv.js';

export async function onRequest(context) {
  const { request, env } = context;
  
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
  
  try {
    const kv = getKV(env);
    
    // Get queue status
    const statusKey = `queue:status:${clinic}`;
    const status = await kv.get(statusKey, 'json') || { current: 0, length: 0 };
    
    // Get counter
    const counterKey = `queue:counter:${clinic}`;
    const counter = await kv.get(counterKey, 'text');
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


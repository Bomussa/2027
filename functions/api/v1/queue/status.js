// Queue Status - Get current queue status for a clinic
// Returns current serving number, total length, and waiting count

import { jsonResponse, checkKVAvailability } from '../../../_shared/utils.js';

export async function onRequest(context) {
  const { request, env } = context;
  
  if (request.method !== 'GET') {
    return jsonResponse({ success: false, error: 'Method not allowed' }, 405);
  }
  
  try {
    const url = new URL(request.url);
    const clinic = url.searchParams.get('clinic');
    
    if (!clinic) {
      return jsonResponse({
        success: false,
        error: 'Missing clinic parameter'
      }, 400);
    }
    
    // Check KV availability
    const kvError = checkKVAvailability(env.KV_QUEUES, 'KV_QUEUES');
    if (kvError) {
      return jsonResponse(kvError, 500);
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
    
    return jsonResponse({
      success: true,
      clinic: clinic,
      current: status.current,
      current_display: status.served.length + 1,
      length: queueList.length,
      waiting: waiting
    });
    
  } catch (error) {
    return jsonResponse({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    }, 500);
  }
}


// Real-time Queue Position Verification
// GET /api/v1/queue/position?clinic=xxx&user=yyy
// Returns accurate, real-time position in queue

import { jsonResponse, corsResponse, checkKVAvailability } from '../../../_shared/utils.js';

export async function onRequestGet(context) {
  const { request, env } = context;
  
  try {
    const url = new URL(request.url);
    const clinic = url.searchParams.get('clinic');
    const user = url.searchParams.get('user');
    
    if (!clinic || !user) {
      return jsonResponse({
        success: false,
        error: 'clinic and user required'
      }, 400);
    }
    
    // Check KV availability
    const kvError = checkKVAvailability(env.KV_QUEUES, 'KV_QUEUES');
    if (kvError) {
      return jsonResponse(kvError, 500);
    }
    
    const kv = env.KV_QUEUES;
    
    // Get user's queue entry
    const userKey = `queue:user:${clinic}:${user}`;
    const userQueue = await kv.get(userKey, 'json');
    
    if (!userQueue) {
      return jsonResponse({
        success: false,
        error: 'User not in queue'
      }, 404);
    }
    
    // If already done, return completed status
    if (userQueue.status === 'DONE') {
      return jsonResponse({
        success: true,
        status: 'DONE',
        display_number: 0,
        ahead: 0,
        total_waiting: 0,
        message: 'Examination completed'
      });
    }
    
    // Get queue list
    const listKey = `queue:list:${clinic}`;
    const queueList = await kv.get(listKey, 'json') || [];
    
    // Get queue status
    const statusKey = `queue:status:${clinic}`;
    const status = await kv.get(statusKey, 'json') || { current: null, served: [] };
    
    // VERIFICATION 1: Get only ACTIVE (WAITING) patients
    const activePromises = queueList.map(async (item) => {
      const itemUserKey = `queue:user:${clinic}:${item.user}`;
      const itemData = await kv.get(itemUserKey, 'json');
      
      // Only include if status is WAITING (not DONE)
      if (itemData && itemData.status === 'WAITING') {
        return {
          ...item,
          number: itemData.number,
          entered_at: itemData.entered_at
        };
      }
      return null;
    });
    
    const activeQueue = (await Promise.all(activePromises)).filter(Boolean);
    
    // VERIFICATION 2: Sort by entry time to ensure correct order
    activeQueue.sort((a, b) => {
      const timeA = new Date(a.entered_at).getTime();
      const timeB = new Date(b.entered_at).getTime();
      return timeA - timeB;
    });
    
    // Calculate position based on entry time
    const myEntryTime = new Date(userQueue.entered_at).getTime();
    const myPosition = activeQueue.filter(item => {
      const itemTime = new Date(item.entered_at).getTime();
      return itemTime <= myEntryTime;
    }).length;
    
    // Calculate how many are ahead
    const ahead = myPosition - 1;
    
    // Estimate waiting time (average 5 minutes per patient)
    const estimatedMinutes = ahead * 5;
    
    return jsonResponse({
      success: true,
      clinic: clinic,
      user: user,
      status: 'WAITING',
      display_number: myPosition,
      ahead: ahead,
      total_waiting: activeQueue.length,
      estimated_wait_minutes: estimatedMinutes,
      verified_at: new Date().toISOString(),
      verification_method: 'real_time_kv_check'
    });
    
  } catch (error) {
    return jsonResponse({
      success: false,
      error: error.message || 'Internal server error',
      timestamp: new Date().toISOString()
    }, 500);
  }
}

// Handle OPTIONS for CORS
export async function onRequestOptions() {
  return corsResponse(['GET', 'OPTIONS']);
}


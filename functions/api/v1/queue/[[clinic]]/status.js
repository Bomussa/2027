/**
 * Queue Status Endpoint
 * GET /api/v1/queue/:clinic/status
 */

export async function onRequestGet(context) {
  const { env, params } = context;
  
  try {
    const clinic = params.clinic?.[0];
    
    if (!clinic) {
      return jsonResponse({ error: 'Clinic name required' }, 400);
    }

    const now = new Date();
    const qatarTime = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Qatar' }));
    const dateKey = qatarTime.toISOString().split('T')[0];

    const queueKey = `queue:${clinic}:${dateKey}`;
    let queueData = await env.KV_QUEUES.get(queueKey, { type: 'json' });

    if (!queueData) {
      return jsonResponse({
        clinic: clinic,
        date: dateKey,
        initialized: false,
        current_pin: null,
        next_pin: null,
        queue_length: 0,
        in_service: 0,
        capacity: 1,
        avg_wait_minutes: 0,
        queue: []
      }, 200);
    }

    // Calculate waiting queue (exclude IN_SERVICE and DONE)
    const waitingQueue = queueData.queue.filter(
      item => item.status === 'WAITING' || item.status === 'NEAR_TURN'
    );

    return jsonResponse({
      clinic: clinic,
      date: dateKey,
      initialized: true,
      current_pin: queueData.current_pin,
      next_pin: queueData.next_pin,
      queue_length: waitingQueue.length,
      in_service: queueData.in_service || 0,
      capacity: queueData.capacity || 1,
      avg_wait_minutes: Math.ceil((queueData.avg_wait_seconds || 0) / 60),
      queue: queueData.queue.map(item => ({
        pin: item.pin,
        status: item.status,
        entered_at: item.entered_at,
        waiting_minutes: item.entered_at 
          ? Math.ceil((Date.now() - new Date(item.entered_at).getTime()) / 60000)
          : 0
      }))
    }, 200);

  } catch (error) {
    return jsonResponse({ error: error.message }, 500);
  }
}

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Cache-Control': 'no-cache, no-store, must-revalidate'
    }
  });
}


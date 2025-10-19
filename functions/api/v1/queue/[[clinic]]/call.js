/**
 * Queue Call Next Endpoint
 * POST /api/v1/queue/:clinic/call
 * Calls the next patient in queue and updates NEAR_TURN status
 */

export async function onRequestPost(context) {
  const { request, env, params } = context;
  
  try {
    const clinic = params.clinic?.[0];
    
    if (!clinic) {
      return jsonResponse({ error: 'Clinic name required' }, 400);
    }

    const now = new Date();
    const qatarTime = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Qatar' }));
    const dateKey = qatarTime.toISOString().split('T')[0];

    // Get queue data
    const queueKey = `queue:${clinic}:${dateKey}`;
    let queueData = await env.KV_QUEUES.get(queueKey, { type: 'json' });

    if (!queueData || !queueData.queue || queueData.queue.length === 0) {
      return jsonResponse({
        error: 'No patients in queue',
        message: 'لا يوجد مراجعين في الانتظار'
      }, 404);
    }

    // Find first WAITING patient
    const waitingIndex = queueData.queue.findIndex(item => item.status === 'WAITING');
    
    if (waitingIndex === -1) {
      return jsonResponse({
        error: 'No waiting patients',
        message: 'لا يوجد مراجعين في حالة الانتظار'
      }, 404);
    }

    const calledPatient = queueData.queue[waitingIndex];
    
    // Update to IN_SERVICE
    calledPatient.status = 'IN_SERVICE';
    calledPatient.called_at = new Date().toISOString();

    // Update current_pin
    queueData.current_pin = calledPatient.pin;
    queueData.in_service += 1;

    // Find next WAITING patient for next_pin
    const nextWaitingIndex = queueData.queue.findIndex((item, idx) => 
      idx > waitingIndex && item.status === 'WAITING'
    );
    
    if (nextWaitingIndex !== -1) {
      queueData.next_pin = queueData.queue[nextWaitingIndex].pin;
      
      // Update NEAR_TURN status for the next patient
      queueData.queue[nextWaitingIndex].status = 'NEAR_TURN';
    } else {
      queueData.next_pin = null;
    }

    // Save queue data
    await env.KV_QUEUES.put(queueKey, JSON.stringify(queueData));

    // Log YOUR_TURN event
    await logEvent(env.KV_EVENTS, {
      type: 'YOUR_TURN',
      clinic: clinic,
      pin: calledPatient.pin,
      date: dateKey,
      timestamp: new Date().toISOString()
    });

    // Log NEAR_TURN event if there's a next patient
    if (nextWaitingIndex !== -1) {
      await logEvent(env.KV_EVENTS, {
        type: 'NEAR_TURN',
        clinic: clinic,
        pin: queueData.queue[nextWaitingIndex].pin,
        date: dateKey,
        timestamp: new Date().toISOString()
      });
    }

    return jsonResponse({
      success: true,
      clinic: clinic,
      current: {
        pin: calledPatient.pin,
        status: 'IN_SERVICE',
        called_at: calledPatient.called_at
      },
      next: nextWaitingIndex !== -1 ? {
        pin: queueData.next_pin,
        status: 'NEAR_TURN'
      } : null,
      queue_length: queueData.queue.filter(item => item.status === 'WAITING').length,
      timestamp: new Date().toISOString()
    }, 200);

  } catch (error) {
    return jsonResponse({ error: error.message }, 500);
  }
}

async function logEvent(kvEvents, event) {
  try {
    const eventKey = `event:${event.clinic}:${event.pin}:${Date.now()}`;
    await kvEvents.put(eventKey, JSON.stringify(event), {
      expirationTtl: 7 * 24 * 60 * 60
    });
  } catch (error) {
    console.error('Event logging failed:', error);
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


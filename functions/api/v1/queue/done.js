// Queue Done - Mark patient as done and unlock next clinic
// POST /api/v1/queue/done
// Body: { clinic, user, pin }

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Access-Control-Allow-Origin': '*'
    }
  });
}

export async function onRequestPost(context) {
  const { request, env } = context;

  try {
    const body = await request.json().catch(() => ({}));
    const { clinic, user, pin } = body;

    if (!clinic || !user) {
      return jsonResponse({
        success: false,
        error: 'clinic and user required'
      }, 400);
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
    
    // Advance current counter in Durable Object
    const id = env.QUEUE_DO.idFromName(clinic);
    const stub = env.QUEUE_DO.get(id);
    const doRequest = new Request(`https://do/${clinic}/done`, {
      method: 'POST'
    });
    await stub.fetch(doRequest);
    
    // Verify PIN if provided (proof of completion)
    if (pin) {
      // Get today's PIN for this clinic
      const pinKey = `pin:daily:${new Date().toISOString().split('T')[0]}`;
      const dailyPins = await env.KV_PINS.get(pinKey, 'json');
      
      if (dailyPins && dailyPins.pins && dailyPins.pins[clinic]) {
        if (pin !== dailyPins.pins[clinic]) {
          return jsonResponse({
            success: false,
            error: 'Invalid PIN - examination not completed'
          }, 403);
        }
      }
    }
    
    // Mark as done
    userQueue.status = 'DONE';
    userQueue.done_at = new Date().toISOString();
    
    await kv.put(userKey, JSON.stringify(userQueue), {
      expirationTtl: 86400
    });
    
    // Store completion proof (unlock next clinic)
    const completionKey = `completion:${user}:${clinic}`;
    await kv.put(completionKey, JSON.stringify({
      clinic: clinic,
      user: user,
      number: userQueue.number,
      pin: pin || 'NO_PIN',
      completed_at: new Date().toISOString()
    }), {
      expirationTtl: 86400
    });
    
    // Update queue status in KV for backward compatibility
    const statusKey = `queue:status:${clinic}`;
    const status = await kv.get(statusKey, 'json') || { current: 0, length: 0 };
    status.current = (status.current || 0) + 1;
    await kv.put(statusKey, JSON.stringify(status), {
      expirationTtl: 86400
    });
    
    // Log event
    const eventKey = `event:${clinic}:${Date.now()}`;
    await env.KV_EVENTS.put(eventKey, JSON.stringify({
      type: 'STEP_DONE',
      clinic: clinic,
      user: user,
      number: userQueue.number,
      timestamp: new Date().toISOString()
    }), {
      expirationTtl: 3600 // 1 hour
    });

    return jsonResponse({
      success: true,
      clinic: clinic,
      user: user,
      number: userQueue.number,
      status: 'DONE',
      next_clinic_unlocked: true
    });

  } catch (error) {
    return jsonResponse({
      success: false,
      error: error.message
    }, 500);
  }
}


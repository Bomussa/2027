// Queue Call - Call next patient in queue
// POST /api/v1/queue/call
// Body: { clinic }

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
    const { clinic } = body;

    if (!clinic) {
      return jsonResponse({
        success: false,
        error: 'clinic required'
      }, 400);
    }

    // Get current queue
    const queueKey = `queue:${clinic}`;
    const queueData = await env.KV_QUEUES.get(queueKey, { type: 'json' });

    if (!queueData) {
      return jsonResponse({
        success: false,
        error: 'Queue not found'
      }, 404);
    }

    // Find next waiting patient
    const nextPatient = queueData.patients.find(p => p.status === 'WAITING' && p.number === queueData.current);

    if (!nextPatient) {
      return jsonResponse({
        success: false,
        error: 'No waiting patients'
      }, 404);
    }

    // Mark as in service
    nextPatient.status = 'IN_SERVICE';
    nextPatient.called_at = new Date().toISOString();

    // Save updated queue
    await env.KV_QUEUES.put(queueKey, JSON.stringify(queueData));

    // Log event
    const eventKey = `event:${clinic}:${Date.now()}`;
    await env.KV_EVENTS.put(eventKey, JSON.stringify({
      type: 'YOUR_TURN',
      clinic: clinic,
      user: nextPatient.user,
      number: nextPatient.number,
      timestamp: new Date().toISOString()
    }), {
      expirationTtl: 3600 // 1 hour
    });

    return jsonResponse({
      success: true,
      clinic: clinic,
      user: nextPatient.user,
      number: nextPatient.number,
      status: 'IN_SERVICE'
    });

  } catch (error) {
    return jsonResponse({
      success: false,
      error: error.message
    }, 500);
  }
}


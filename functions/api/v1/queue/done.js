// Queue Done - Mark patient as done and advance queue
// POST /api/v1/queue/done
// Body: { clinic, user }

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
    const { clinic, user } = body;

    if (!clinic || !user) {
      return jsonResponse({
        success: false,
        error: 'clinic and user required'
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

    // Find user in queue
    const userIndex = queueData.patients.findIndex(p => p.user === user);

    if (userIndex === -1) {
      return jsonResponse({
        success: false,
        error: 'User not in queue'
      }, 404);
    }

    const patient = queueData.patients[userIndex];

    // Mark as done
    patient.status = 'DONE';
    patient.done_at = new Date().toISOString();

    // Remove from queue
    queueData.patients.splice(userIndex, 1);
    queueData.length = queueData.patients.length;

    // Advance current if this was the current patient
    if (patient.number === queueData.current) {
      queueData.current += 1;
    }

    // Save updated queue
    await env.KV_QUEUES.put(queueKey, JSON.stringify(queueData));

    // Log event
    const eventKey = `event:${clinic}:${Date.now()}`;
    await env.KV_EVENTS.put(eventKey, JSON.stringify({
      type: 'STEP_DONE_NEXT',
      clinic: clinic,
      user: user,
      number: patient.number,
      timestamp: new Date().toISOString()
    }), {
      expirationTtl: 3600 // 1 hour
    });

    return jsonResponse({
      success: true,
      clinic: clinic,
      user: user,
      number: patient.number,
      status: 'DONE',
      next_current: queueData.current
    });

  } catch (error) {
    return jsonResponse({
      success: false,
      error: error.message
    }, 500);
  }
}


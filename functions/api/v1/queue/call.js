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

    const kv = env.KV_QUEUES;
    
    // Get current status
    const statusKey = `queue:status:${clinic}`;
    const status = await kv.get(statusKey, 'json') || { current: 0, length: 0 };
    
    // Get counter to verify there are patients
    const counterKey = `queue:counter:${clinic}`;
    const counter = await kv.get(counterKey, 'text');
    const total = counter ? parseInt(counter) : 0;
    
    if (total === 0) {
      return jsonResponse({
        success: false,
        error: 'No patients in queue'
      }, 404);
    }
    
    // Advance to next patient
    const nextNumber = (status.current || 0) + 1;
    
    if (nextNumber > total) {
      return jsonResponse({
        success: false,
        error: 'No more patients waiting'
      }, 404);
    }
    
    // Update status
    status.current = nextNumber;
    await kv.put(statusKey, JSON.stringify(status), {
      expirationTtl: 86400
    });
    
    // Log event
    const eventKey = `event:${clinic}:${Date.now()}`;
    await env.KV_EVENTS.put(eventKey, JSON.stringify({
      type: 'CALL_NEXT',
      clinic: clinic,
      number: nextNumber,
      timestamp: new Date().toISOString()
    }), {
      expirationTtl: 3600 // 1 hour
    });

    return jsonResponse({
      success: true,
      clinic: clinic,
      number: nextNumber,
      waiting: Math.max(0, total - nextNumber)
    });

  } catch (error) {
    return jsonResponse({
      success: false,
      error: error.message
    }, 500);
  }
}


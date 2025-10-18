/**
 * Queue Enter Endpoint
 * POST /api/queue/enter
 * Body: { clinicId, visitId }
 */

export async function onRequestPost(context) {
  const { request, env } = context;
  
  try {
    const body = await request.json().catch(() => ({}));
    const { clinicId, visitId } = body;
    
    if (!clinicId || !visitId) {
      return jsonResponse({ 
        ok: false,
        error: 'clinicId and visitId required' 
      }, 400);
    }

    const now = new Date();
    const qatarTime = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Qatar' }));
    const dateKey = qatarTime.toISOString().split('T')[0];

    // Get queue data
    const queueKey = `queue:${clinicId}:${dateKey}`;
    let queueData = await env.KV_QUEUES.get(queueKey, { type: 'json' });

    if (!queueData) {
      queueData = {
        clinicId: clinicId,
        dateKey: dateKey,
        waiting: [],
        in: [],
        done: [],
        nextCallTicket: 1,
        stats: {
          totalEntered: 0,
          totalCompleted: 0,
          avgWaitSeconds: 0
        }
      };
    }

    // Check if visitId already in queue
    const allEntries = [...queueData.waiting, ...queueData.in, ...queueData.done];
    const existing = allEntries.find(item => item.visitId === visitId);
    
    if (existing) {
      return jsonResponse({
        ok: false,
        error: 'Visit already in queue',
        ticket: existing.ticket,
        status: existing.status
      }, 409);
    }

    // Assign ticket number
    const ticket = queueData.nextCallTicket;
    queueData.nextCallTicket += 1;

    // Add to waiting queue
    const queueEntry = {
      ticket: ticket,
      visitId: visitId,
      clinicId: clinicId,
      dateKey: dateKey,
      status: 'WAITING',
      enteredAt: new Date().toISOString(),
      calledAt: null,
      completedAt: null
    };

    queueData.waiting.push(queueEntry);
    queueData.stats.totalEntered += 1;

    // Save queue data
    await env.KV_QUEUES.put(queueKey, JSON.stringify(queueData));

    // Log event
    await logEvent(env.KV_EVENTS, {
      type: 'QUEUE_ENTERED',
      clinicId: clinicId,
      visitId: visitId,
      ticket: ticket,
      dateKey: dateKey,
      timestamp: new Date().toISOString()
    });

    return jsonResponse({
      ok: true,
      ticket: ticket,
      clinicId: clinicId,
      dateKey: dateKey,
      status: 'WAITING',
      position: queueData.waiting.length
    }, 200);

  } catch (error) {
    return jsonResponse({ 
      ok: false,
      error: error.message 
    }, 500);
  }
}

async function logEvent(kvEvents, event) {
  try {
    const eventKey = `event:${Date.now()}:${Math.random().toString(36).substr(2, 9)}`;
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


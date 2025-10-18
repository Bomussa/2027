/**
 * Queue Complete Endpoint
 * POST /api/queue/complete
 * Body: { clinicId, visitId, ticket }
 */

export async function onRequestPost(context) {
  const { request, env } = context;
  
  try {
    const body = await request.json().catch(() => ({}));
    const { clinicId, visitId, ticket } = body;
    
    if (!clinicId || !visitId || !ticket) {
      return jsonResponse({ 
        ok: false,
        error: 'clinicId, visitId, and ticket required' 
      }, 400);
    }

    const now = new Date();
    const qatarTime = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Qatar' }));
    const dateKey = qatarTime.toISOString().split('T')[0];

    const queueKey = `queue:${clinicId}:${dateKey}`;
    let queueData = await env.KV_QUEUES.get(queueKey, { type: 'json' });

    if (!queueData) {
      return jsonResponse({
        ok: false,
        error: 'Queue not found'
      }, 404);
    }

    // Find entry in waiting or in arrays
    let entry = null;
    let sourceArray = null;

    if (queueData.waiting) {
      const idx = queueData.waiting.findIndex(e => e.ticket === ticket && e.visitId === visitId);
      if (idx >= 0) {
        entry = queueData.waiting.splice(idx, 1)[0];
        sourceArray = 'waiting';
      }
    }

    if (!entry && queueData.in) {
      const idx = queueData.in.findIndex(e => e.ticket === ticket && e.visitId === visitId);
      if (idx >= 0) {
        entry = queueData.in.splice(idx, 1)[0];
        sourceArray = 'in';
      }
    }

    if (!entry) {
      return jsonResponse({
        ok: false,
        error: 'Entry not found in queue'
      }, 404);
    }

    // Mark as completed
    entry.status = 'DONE';
    entry.completedAt = new Date().toISOString();
    
    if (!queueData.done) {
      queueData.done = [];
    }
    queueData.done.push(entry);

    // Update stats
    if (!queueData.stats) {
      queueData.stats = { totalEntered: 0, totalCompleted: 0, avgWaitSeconds: 0 };
    }
    queueData.stats.totalCompleted += 1;

    // Calculate wait time
    if (entry.enteredAt) {
      const waitMs = new Date(entry.completedAt) - new Date(entry.enteredAt);
      const waitSeconds = Math.floor(waitMs / 1000);
      
      // Update average
      const prevAvg = queueData.stats.avgWaitSeconds || 0;
      const count = queueData.stats.totalCompleted;
      queueData.stats.avgWaitSeconds = Math.floor((prevAvg * (count - 1) + waitSeconds) / count);
    }

    // Save
    await env.KV_QUEUES.put(queueKey, JSON.stringify(queueData));

    // Log event
    await logEvent(env.KV_EVENTS, {
      type: 'QUEUE_COMPLETED',
      clinicId: clinicId,
      visitId: visitId,
      ticket: ticket,
      dateKey: dateKey,
      timestamp: new Date().toISOString()
    });

    return jsonResponse({
      ok: true,
      ticket: ticket,
      status: 'DONE'
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


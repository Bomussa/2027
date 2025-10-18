/**
 * Queue Status Endpoint
 * GET /api/queue/status/:clinicId
 */

export async function onRequestGet(context) {
  const { env, params } = context;
  
  try {
    const clinicId = params.clinicId?.[0];
    
    if (!clinicId) {
      return jsonResponse({ ok: false, error: 'clinicId required' }, 400);
    }

    const now = new Date();
    const qatarTime = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Qatar' }));
    const dateKey = qatarTime.toISOString().split('T')[0];

    const queueKey = `queue:${clinicId}:${dateKey}`;
    let queueData = await env.KV_QUEUES.get(queueKey, { type: 'json' });

    if (!queueData) {
      return jsonResponse({
        ok: true,
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
      }, 200);
    }

    return jsonResponse({
      ok: true,
      clinicId: clinicId,
      dateKey: dateKey,
      waiting: queueData.waiting || [],
      in: queueData.in || [],
      done: queueData.done || [],
      nextCallTicket: queueData.nextCallTicket || 1,
      stats: queueData.stats || {
        totalEntered: 0,
        totalCompleted: 0,
        avgWaitSeconds: 0
      }
    }, 200);

  } catch (error) {
    return jsonResponse({ 
      ok: false,
      error: error.message 
    }, 500);
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


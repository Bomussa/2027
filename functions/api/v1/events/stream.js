// SSE Events Stream - Real-time notifications
// GET /api/v1/events/stream?clinic=<clinic>&user=<user>

export async function onRequestGet(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const clinic = url.searchParams.get('clinic');
  const user = url.searchParams.get('user');

  if (!clinic) {
    return new Response(JSON.stringify({ error: 'clinic required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  // For Cloudflare Workers, we use polling-based SSE
  // Get current queue status and send single event
  try {
    const queueKey = `queue:${clinic}`;
    const queueData = await env.KV_QUEUES.get(queueKey, { type: 'json' });

    let event = {
      type: 'CONNECTED',
      clinic: clinic,
      timestamp: new Date().toISOString()
    };

    if (queueData) {
      if (user) {
        const patient = queueData.patients ? queueData.patients.find(p => p.user === user) : null;

        if (patient) {
          const diff = queueData.current - patient.number;
          let eventType = 'NO_ALERT';

          if (patient.status === 'IN_SERVICE') {
            eventType = 'YOUR_TURN';
          } else if (diff <= 2 && diff >= 0) {
            eventType = 'NEAR_TURN';
          } else if (diff === 0) {
            eventType = 'YOUR_TURN';
          } else if (patient.status === 'DONE') {
            eventType = 'STEP_DONE_NEXT';
          }

          event = {
            type: eventType,
            clinic: clinic,
            user: user,
            number: patient.number,
            current: queueData.current,
            ahead: Math.max(0, patient.number - queueData.current),
            timestamp: new Date().toISOString()
          };
        }
      } else {
        event = {
          type: 'QUEUE_UPDATE',
          clinic: clinic,
          current: queueData.current,
          length: queueData.length,
          waiting: queueData.patients ? queueData.patients.filter(p => p.status === 'WAITING').length : 0,
          timestamp: new Date().toISOString()
        };
      }
    }

    const sseData = 'data: ' + JSON.stringify(event) + '\n\n';

    return new Response(sseData, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*'
      }
    });

  } catch (error) {
    return new Response('data: {"type":"ERROR","message":"' + error.message + '"}\n\n', {
      headers: {
        'Content-Type': 'text/event-stream',
        'Access-Control-Allow-Origin': '*'
      }
    });
  }
}


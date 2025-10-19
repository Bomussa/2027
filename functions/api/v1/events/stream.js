// SSE Events Stream - Real-time notifications with Heartbeat
// GET /api/v1/events/stream?clinic=<clinic>&user=<user>

export async function onRequestGet(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const clinic = url.searchParams.get('clinic');
  const user = url.searchParams.get('user');

  if (!clinic) {
    return new Response(JSON.stringify({ error: 'clinic required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json; charset=utf-8' }
    });
  }

  // Create a TransformStream for SSE
  const { readable, writable } = new TransformStream();
  const writer = writable.getWriter();
  const encoder = new TextEncoder();

  // Helper function to send SSE message
  const sendEvent = async (data) => {
    try {
      await writer.write(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
    } catch (e) {
      // Connection closed
    }
  };

  // Send initial connection message
  await sendEvent({
    type: 'CONNECTED',
    clinic: clinic,
    user: user || null,
    timestamp: new Date().toISOString()
  });

  // Heartbeat mechanism - send ping every 15 seconds
  const heartbeatInterval = setInterval(async () => {
    try {
      await writer.write(encoder.encode(`: heartbeat\n\n`));
    } catch (e) {
      clearInterval(heartbeatInterval);
      clearInterval(updateInterval);
    }
  }, 15000);

  // Update mechanism - check queue status every 5 seconds
  const updateInterval = setInterval(async () => {
    try {
      // Get queue status from Durable Object
      const id = env.QUEUE_DO.idFromName(clinic);
      const stub = env.QUEUE_DO.get(id);
      const doRequest = new Request(`https://do/${clinic}/status`, {
        method: 'GET'
      });
      const doResponse = await stub.fetch(doRequest);
      const queueStatus = await doResponse.json();

      if (user) {
        // Get user-specific queue info
        const userKey = `queue:user:${clinic}:${user}`;
        const userQueue = await env.KV_QUEUES.get(userKey, 'json');

        if (userQueue) {
          const current = queueStatus.current || 0;
          const userNumber = userQueue.number;
          const diff = userNumber - current;

          let eventType = 'NO_ALERT';
          
          if (userQueue.status === 'DONE') {
            eventType = 'STEP_DONE_NEXT';
          } else if (diff === 0) {
            eventType = 'YOUR_TURN';
          } else if (diff > 0 && diff <= 2) {
            eventType = 'NEAR_TURN';
          }

          await sendEvent({
            type: eventType,
            clinic: clinic,
            user: user,
            number: userNumber,
            current: current,
            ahead: Math.max(0, diff),
            status: userQueue.status,
            timestamp: new Date().toISOString()
          });
        }
      } else {
        // Send general queue update
        await sendEvent({
          type: 'QUEUE_UPDATE',
          clinic: clinic,
          current: queueStatus.current || 0,
          length: queueStatus.length || 0,
          waiting: queueStatus.waiting || 0,
          timestamp: new Date().toISOString()
        });
      }
    } catch (e) {
      // Error getting update, continue
      console.error('SSE update error:', e);
    }
  }, 5000);

  // Cleanup after 5 minutes
  setTimeout(() => {
    clearInterval(heartbeatInterval);
    clearInterval(updateInterval);
    writer.close().catch(() => {});
  }, 300000);

  return new Response(readable, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
      'X-Accel-Buffering': 'no'
    }
  });
}


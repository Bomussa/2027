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

  // Create SSE stream
  const { readable, writable } = new TransformStream();
  const writer = writable.getWriter();
  const encoder = new TextEncoder();

  // Send initial connection message
  await writer.write(encoder.encode('data: {"type":"CONNECTED","clinic":"' + clinic + '"}\n\n'));

  // Start monitoring loop
  const interval = setInterval(async () => {
    try {
      // Get current queue status
      const queueKey = `queue:${clinic}`;
      const queueData = await env.KV_QUEUES.get(queueKey, { type: 'json' });

      if (!queueData) {
        return;
      }

      // Find user in queue
      if (user) {
        const patient = queueData.patients.find(p => p.user === user);

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

          const event = {
            type: eventType,
            clinic: clinic,
            user: user,
            number: patient.number,
            current: queueData.current,
            ahead: Math.max(0, patient.number - queueData.current),
            timestamp: new Date().toISOString()
          };

          await writer.write(encoder.encode('data: ' + JSON.stringify(event) + '\n\n'));
        }
      } else {
        // Broadcast mode - send current status
        const event = {
          type: 'QUEUE_UPDATE',
          clinic: clinic,
          current: queueData.current,
          length: queueData.length,
          waiting: queueData.patients.filter(p => p.status === 'WAITING').length,
          timestamp: new Date().toISOString()
        };

        await writer.write(encoder.encode('data: ' + JSON.stringify(event) + '\n\n'));
      }

    } catch (error) {
      console.error('SSE error:', error);
    }
  }, 2000); // Check every 2 seconds

  // Cleanup on connection close
  request.signal.addEventListener('abort', () => {
    clearInterval(interval);
    writer.close();
  });

  return new Response(readable, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*'
    }
  });
}


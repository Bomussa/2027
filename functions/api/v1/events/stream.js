/**
 * Server-Sent Events (SSE) Stream Endpoint
 * GET /api/v1/events/stream?pin=XX&clinic=YY
 * Real-time event notifications for patients
 */

export async function onRequestGet(context) {
  const { request, env } = context;
  
  try {
    const url = new URL(request.url);
    const pin = url.searchParams.get('pin');
    const clinic = url.searchParams.get('clinic');

    if (!pin || !clinic) {
      return new Response('Missing pin or clinic parameter', { status: 400 });
    }

    // Create SSE stream
    const { readable, writable } = new TransformStream();
    const writer = writable.getWriter();
    const encoder = new TextEncoder();

    // Send initial connection message
    await writer.write(encoder.encode(`data: ${JSON.stringify({
      type: 'CONNECTED',
      message: 'متصل بنظام الإشعارات',
      timestamp: new Date().toISOString()
    })}\n\n`));

    // Start polling for events
    const pollInterval = 2000; // 2 seconds
    let lastEventTime = Date.now();

    const poll = async () => {
      try {
        const now = new Date();
        const qatarTime = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Qatar' }));
        const dateKey = qatarTime.toISOString().split('T')[0];

        // Get queue status
        const queueKey = `queue:${clinic}:${dateKey}`;
        const queueData = await env.KV_QUEUES.get(queueKey, { type: 'json' });

        if (queueData && queueData.queue) {
          const patient = queueData.queue.find(item => item.pin === pin);

          if (patient) {
            // Check for status changes
            const event = {
              type: 'QUEUE_UPDATE',
              pin: pin,
              clinic: clinic,
              status: patient.status,
              current_pin: queueData.current_pin,
              next_pin: queueData.next_pin,
              position: queueData.queue.filter(item => 
                item.status === 'WAITING' && 
                queueData.queue.indexOf(item) < queueData.queue.indexOf(patient)
              ).length + 1,
              timestamp: new Date().toISOString()
            };

            // Send YOUR_TURN notification
            if (patient.status === 'IN_SERVICE' && patient.called_at) {
              const calledTime = new Date(patient.called_at).getTime();
              if (calledTime > lastEventTime) {
                await writer.write(encoder.encode(`data: ${JSON.stringify({
                  type: 'YOUR_TURN',
                  message: 'حان دورك الآن! توجه للعيادة',
                  clinic: clinic,
                  pin: pin,
                  timestamp: new Date().toISOString()
                })}\n\n`));
                lastEventTime = Date.now();
              }
            }

            // Send NEAR_TURN notification
            if (patient.status === 'NEAR_TURN') {
              await writer.write(encoder.encode(`data: ${JSON.stringify({
                type: 'NEAR_TURN',
                message: 'اقترب دورك',
                clinic: clinic,
                pin: pin,
                position: event.position,
                timestamp: new Date().toISOString()
              })}\n\n`));
            }

            // Send regular update
            await writer.write(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
          }
        }

        // Keep-alive ping
        await writer.write(encoder.encode(`: ping\n\n`));

      } catch (error) {
        console.error('SSE poll error:', error);
      }
    };

    // Poll every 2 seconds
    const intervalId = setInterval(poll, pollInterval);

    // Initial poll
    poll();

    // Clean up on disconnect
    request.signal.addEventListener('abort', () => {
      clearInterval(intervalId);
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

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}


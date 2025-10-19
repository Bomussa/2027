// SSE endpoint for real-time notifications
// Cloudflare Pages Functions format

export const onRequestGet = async (context) => {
  const { request, env } = context;
  
  // Create a TransformStream for SSE
  const { readable, writable } = new TransformStream();
  const writer = writable.getWriter();
  const encoder = new TextEncoder();

  // Function to send SSE events
  const sendEvent = (eventName, data) => {
    const payload = `event: ${eventName}\ndata: ${JSON.stringify(data)}\n\n`;
    writer.ready.then(() => {
      writer.write(encoder.encode(payload)).catch(() => {});
    });
  };

  // Send initial connection event
  sendEvent('connected', { status: 'ok', timestamp: Date.now() });

  // Send heartbeat every 10 seconds
  const heartbeatInterval = setInterval(() => {
    sendEvent('heartbeat', { ts: Date.now(), type: 'heartbeat' });
  }, 10000);

  // Handle client disconnect
  request.signal.addEventListener('abort', () => {
    clearInterval(heartbeatInterval);
    writer.close().catch(() => {});
  });

  // Return SSE response
  return new Response(readable, {
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
      'X-Accel-Buffering': 'no'
    }
  });
};


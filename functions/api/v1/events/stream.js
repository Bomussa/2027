// SSE Events Stream - Real-time notifications
// GET /api/v1/events/stream?clinic=<clinic>&user=<user>

export async function onRequestGet(context) {
  const { request, env } = context;
  
  const { readable, writable } = new TransformStream();
  const writer = writable.getWriter();
  const encoder = new TextEncoder();

  // Send initial connection event asynchronously
  (async () => {
    try {
      await writer.write(encoder.encode("event: connected\n"));
      await writer.write(encoder.encode('data: {"status":"ok"}\n\n'));
      
      // Keep connection alive with heartbeat
      const interval = setInterval(async () => {
        try {
          await writer.write(encoder.encode(": heartbeat\n\n"));
        } catch (e) {
          clearInterval(interval);
        }
      }, 15000);
      
      // Cleanup after 5 minutes
      setTimeout(() => {
        clearInterval(interval);
        writer.close().catch(() => {});
      }, 300000);
      
    } catch (e) {
      writer.close().catch(() => {});
    }
  })();

  // Handle client disconnect
  request.signal.addEventListener("abort", () => {
    writer.close().catch(() => {});
  });

  return new Response(readable, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      "Connection": "keep-alive",
      "Access-Control-Allow-Origin": "*",
      "X-Accel-Buffering": "no"
    },
  });
}


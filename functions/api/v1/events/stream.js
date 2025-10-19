// SSE Events Stream - Real-time notifications
// GET /api/v1/events/stream?clinic=<clinic>&user=<user>

export async function onRequestGet(context) {
  const { request, env } = context;
  
  const { readable, writable } = new TransformStream();
  const writer = writable.getWriter();
  const encoder = new TextEncoder();

  // أول حدث يؤكد الاتصال
  await writer.write(encoder.encode("event: connected\n"));
  await writer.write(encoder.encode('data: {"status":"ok"}\n\n'));

  // إغلاق آمن عند إنهاء الاتصال
  request.signal.addEventListener("abort", () => {
    writer.close().catch(() => {});
  });

  return new Response(readable, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive",
      "Access-Control-Allow-Origin": "*",
    },
  });
}


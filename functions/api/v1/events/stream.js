export default {
  async fetch(request, env, ctx) {
    const { readable, writable } = new TransformStream();
    const writer = writable.getWriter();
    const encoder = new TextEncoder();

    // أول حدث يؤكد الاتصال
    writer.write(encoder.encode("event: connected\n"));
    writer.write(encoder.encode('data: {"status":"ok"}\n\n'));

    // أمثلة لأحداث لاحقة (سيتم توليدها عند الحاجة)
    // writer.write(encoder.encode("event: your_turn\n"));
    // writer.write(encoder.encode('data: {"message":"Your turn"}\n\n'));

    // إغلاق آمن عند إنهاء الاتصال
    request.signal.addEventListener("abort", () => writer.close());

    return new Response(readable, {
      headers: {
        "Content-Type": "text/event-stream; charset=utf-8",
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
      },
    });
  },
};


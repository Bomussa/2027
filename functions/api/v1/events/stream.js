export default {
  async fetch(request, env, ctx) {
    const { readable, writable } = new TransformStream();
    const writer = writable.getWriter();
    const encoder = new TextEncoder();

    // Asynchronous sending function without await
    function sendEvent(name, data) {
      const payload =
        `event: ${name}\n` +
        `data: ${JSON.stringify(data)}\n\n`;
      writer.ready.then(() => writer.write(encoder.encode(payload)));
    }

    // Initial connection confirmation
    sendEvent("connected", { status: "ok" });

    // Send pings every 5 seconds to confirm continuity
    const interval = setInterval(() => {
      sendEvent("ping", { ts: Date.now() });
    }, 5000);

    // Close the connection when the request is aborted
    request.signal.addEventListener("abort", () => {
      clearInterval(interval);
      writer.close();
    });

    return new Response(readable, {
      headers: {
        "Content-Type": "text/event-stream; charset=utf-8",
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
      },
    });
  },
};

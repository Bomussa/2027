// SSE endpoint for real-time notifications delivery
// GET /api/v1/events/notifications?recipient_type=patient&recipient_id=123
// Delivers notifications in real-time using Server-Sent Events

export const onRequestGet = async (context) => {
  const { request, env } = context;
  const url = new URL(request.url);
  
  const recipient_type = url.searchParams.get('recipient_type') || 'patient';
  const recipient_id = url.searchParams.get('recipient_id');
  
  if (!recipient_id) {
    return new Response(JSON.stringify({
      error: 'recipient_id is required'
    }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }
  
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
  sendEvent('connected', { 
    status: 'ok', 
    timestamp: Date.now(),
    recipient_id,
    recipient_type
  });

  // Function to check and send pending notifications
  const checkNotifications = async () => {
    try {
      const kv = env.KV_ADMIN;
      const sseQueueKey = `sse:queue:${recipient_type}:${recipient_id}`;
      const sseQueue = await kv.get(sseQueueKey, { type: 'json' }) || [];
      
      // Send all pending notifications
      for (const notification of sseQueue) {
        sendEvent('notification', notification);
      }
      
      // Clear the queue after sending
      if (sseQueue.length > 0) {
        await kv.delete(sseQueueKey);
      }
      
      // Also check for broadcast notifications
      const broadcastQueueKey = `sse:queue:${recipient_type}:all`;
      const broadcastQueue = await kv.get(broadcastQueueKey, { type: 'json' }) || [];
      
      for (const notification of broadcastQueue) {
        sendEvent('notification', notification);
      }
      
    } catch (error) {
      console.error('Error checking notifications:', error);
    }
  };

  // Check for notifications every 2 seconds
  const notificationCheckInterval = setInterval(async () => {
    await checkNotifications();
  }, 2000);

  // Send heartbeat every 10 seconds
  const heartbeatInterval = setInterval(() => {
    sendEvent('heartbeat', { 
      ts: Date.now(), 
      type: 'heartbeat',
      recipient_id,
      recipient_type
    });
  }, 10000);

  // Handle client disconnect
  request.signal.addEventListener('abort', () => {
    clearInterval(heartbeatInterval);
    clearInterval(notificationCheckInterval);
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


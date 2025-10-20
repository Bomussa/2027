// SSE endpoint for real-time notifications
// Cloudflare Pages Functions format

export const onRequestGet = async (context) => {
  const { request, env } = context;
  const url = new URL(request.url);
  const clinic = url.searchParams.get('clinic');
  const user = url.searchParams.get('user');
  
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
  sendEvent('connected', { status: 'ok', timestamp: Date.now(), clinic, user });

  // Function to check queue and send notifications
  const checkQueueAndNotify = async () => {
    if (!clinic || !user) return;
    
    try {
      // Get queue status from KV
      const dateKey = new Date().toISOString().split('T')[0];
      const queueKey = `queue:${clinic}:${dateKey}`;
      const queueData = await env.MMC_KV.get(queueKey, { type: 'json' });
      
      if (!queueData || !queueData.waiting) return;
      
      // Find user's position
      const userIndex = queueData.waiting.findIndex(entry => entry.user === user);
      if (userIndex === -1) return;
      
      const position = userIndex + 1;
      
      // Send notification based on position
      if (position === 1) {
        sendEvent('queue_update', {
          type: 'YOUR_TURN',
          clinic,
          user,
          position: 1,
          message: 'دورك الآن',
          messageEn: 'Your turn now',
          timestamp: Date.now()
        });
      } else if (position === 2) {
        sendEvent('queue_update', {
          type: 'NEAR_TURN',
          clinic,
          user,
          position: 2,
          message: 'اقترب دورك - أنت التالي',
          messageEn: 'Near your turn - You are next',
          timestamp: Date.now()
        });
      } else if (position === 3) {
        sendEvent('queue_update', {
          type: 'ALMOST_READY',
          clinic,
          user,
          position: 3,
          message: 'استعد - أنت الثالث',
          messageEn: 'Get ready - You are third',
          timestamp: Date.now()
        });
      } else {
        sendEvent('queue_update', {
          type: 'POSITION_UPDATE',
          clinic,
          user,
          position,
          message: `موقعك في الدور: ${position}`,
          messageEn: `Your position: ${position}`,
          timestamp: Date.now()
        });
      }
    } catch (error) {
      console.error('Error checking queue:', error);
    }
  };

  // Check queue immediately
  checkQueueAndNotify();

  // Check queue every 5 seconds
  const queueCheckInterval = setInterval(checkQueueAndNotify, 5000);

  // Send heartbeat every 15 seconds
  const heartbeatInterval = setInterval(() => {
    sendEvent('heartbeat', { ts: Date.now(), type: 'heartbeat' });
  }, 15000);

  // Handle client disconnect
  request.signal.addEventListener('abort', () => {
    clearInterval(heartbeatInterval);
    clearInterval(queueCheckInterval);
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


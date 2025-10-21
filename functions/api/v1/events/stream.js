// SSE endpoint for real-time notifications
// Cloudflare Pages Functions format
// Updated to work with current queue structure

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

  // Track last position to detect changes
  let lastPosition = null;
  let lastNotificationType = null;

  // Function to check queue and send notifications
  const checkQueueAndNotify = async () => {
    if (!clinic || !user) return;
    
    try {
      // Get queue data from current structure
      const kv = env?.KV_QUEUES;
      if (!kv) return;

      const listKey = `queue:list:${clinic}`;
      const statusKey = `queue:status:${clinic}`;
      const userKey = `queue:user:${clinic}:${user}`;
      
      // Get queue list and status
      const queueList = await kv.get(listKey, { type: 'json' }) || [];
      const status = await kv.get(statusKey, { type: 'json' }) || { current: null, served: [] };
      const userEntry = await kv.get(userKey, { type: 'json' });
      
      if (!userEntry || !userEntry.number) return;
      
      const userNumber = userEntry.number;
      
      // Calculate position in queue
      let position = 0;
      let ahead = 0;
      
      if (status.current) {
        // Someone is being served
        // Count how many are ahead of us (between current and us)
        ahead = queueList.filter(item => 
          item.number > status.current && 
          item.number < userNumber &&
          !status.served.includes(item.number)
        ).length;
        position = ahead + 1; // +1 because current is position 0
      } else {
        // No one being served yet
        ahead = queueList.filter(item => 
          item.number < userNumber &&
          !status.served.includes(item.number)
        ).length;
        position = ahead + 1;
      }
      
      // Total waiting
      const totalWaiting = queueList.filter(item => 
        !status.served.includes(item.number)
      ).length;
      
      // Determine notification type based on position
      let notificationType = null;
      let shouldNotify = false;
      
      if (ahead === 0 && !status.current) {
        // User is first and no one is being served - YOUR TURN
        notificationType = 'YOUR_TURN';
        shouldNotify = lastNotificationType !== 'YOUR_TURN';
      } else if (ahead === 0 && status.current && status.current !== userNumber) {
        // User is next (current is being served)
        notificationType = 'NEXT_IN_LINE';
        shouldNotify = lastNotificationType !== 'NEXT_IN_LINE';
      } else if (ahead === 1) {
        // User is second in line
        notificationType = 'NEAR_TURN';
        shouldNotify = lastNotificationType !== 'NEAR_TURN';
      } else if (ahead === 2) {
        // User is third in line
        notificationType = 'ALMOST_READY';
        shouldNotify = lastNotificationType !== 'ALMOST_READY';
      } else if (position !== lastPosition) {
        // Position changed
        notificationType = 'POSITION_UPDATE';
        shouldNotify = true;
      }
      
      // Send notification if needed
      if (shouldNotify && notificationType) {
        let message = '';
        let messageEn = '';
        
        switch (notificationType) {
          case 'YOUR_TURN':
            message = '🔔 حان دورك الآن!';
            messageEn = '🔔 Your turn now!';
            break;
          case 'NEXT_IN_LINE':
            message = '⏰ أنت التالي - استعد';
            messageEn = '⏰ You are next - Get ready';
            break;
          case 'NEAR_TURN':
            message = '⏰ اقترب دورك';
            messageEn = '⏰ Near your turn';
            break;
          case 'ALMOST_READY':
            message = '📋 استعد - أنت الثالث';
            messageEn = '📋 Get ready - You are third';
            break;
          case 'POSITION_UPDATE':
            message = `📊 موقعك: ${position} من ${totalWaiting}`;
            messageEn = `📊 Position: ${position} of ${totalWaiting}`;
            break;
        }
        
        sendEvent('queue_update', {
          type: notificationType,
          clinic,
          user,
          position,
          ahead,
          total: totalWaiting,
          number: userNumber,
          current: status.current,
          message,
          messageEn,
          timestamp: Date.now()
        });
        
        lastNotificationType = notificationType;
        lastPosition = position;
      }
      
    } catch (error) {
      console.error('Error checking queue:', error);
    }
  };

  // Check queue immediately
  checkQueueAndNotify();

  // Check queue every 2 seconds for real-time updates
  const queueCheckInterval = setInterval(checkQueueAndNotify, 2000);

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


// Advanced Notification System - Get Notifications
// GET /api/v1/notifications/get?recipient_type=patient&recipient_id=123&unread_only=false

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Access-Control-Allow-Origin': '*',
      'Cache-Control': 'no-cache, no-store, must-revalidate'
    }
  });
}

export async function onRequestGet(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  
  const recipient_type = url.searchParams.get('recipient_type') || 'patient';
  const recipient_id = url.searchParams.get('recipient_id');
  const unread_only = url.searchParams.get('unread_only') === 'true';
  const limit = parseInt(url.searchParams.get('limit') || '20');
  
  if (!recipient_id) {
    return jsonResponse({
      success: false,
      error: 'recipient_id is required'
    }, 400);
  }
  
  try {
    const kv = env.KV_ADMIN;
    
    // Get user's notification list
    const userListKey = `notification:${recipient_type}:${recipient_id}:list`;
    const notificationList = await kv.get(userListKey, { type: 'json' }) || [];
    
    // Filter by unread if requested
    let filteredList = unread_only 
      ? notificationList.filter(n => !n.read)
      : notificationList;
    
    // Apply limit
    filteredList = filteredList.slice(-limit).reverse();
    
    // Fetch full notification details
    const notifications = [];
    for (const item of filteredList) {
      const notificationKey = `notification:${recipient_type}:${recipient_id}:${item.id}`;
      const notification = await kv.get(notificationKey, { type: 'json' });
      if (notification) {
        notifications.push(notification);
      }
    }
    
    // Get broadcast notifications
    const broadcastListKey = 'notification:broadcast:list';
    const broadcastList = await kv.get(broadcastListKey, { type: 'json' }) || [];
    
    // Fetch recent broadcasts (last 5)
    const broadcasts = [];
    for (const item of broadcastList.slice(-5)) {
      const broadcastKey = `notification:broadcast:${item.id}`;
      const broadcast = await kv.get(broadcastKey, { type: 'json' });
      if (broadcast) {
        broadcasts.push(broadcast);
      }
    }
    
    // Calculate statistics
    const unread_count = notificationList.filter(n => !n.read).length;
    const total_count = notificationList.length;
    
    return jsonResponse({
      success: true,
      recipient_id,
      recipient_type,
      notifications,
      broadcasts,
      statistics: {
        total: total_count,
        unread: unread_count,
        read: total_count - unread_count
      },
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Get notifications error:', error);
    return jsonResponse({
      success: false,
      error: error.message
    }, 500);
  }
}


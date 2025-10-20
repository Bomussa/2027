// Advanced Notification System - Send Notifications
// POST /api/v1/notifications/send
// Sends real-time notifications to patients and staff

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

// Notification types
const NOTIFICATION_TYPES = {
  QUEUE_UPDATE: 'queue_update',
  YOUR_TURN: 'your_turn',
  NEAR_TURN: 'near_turn',
  STEP_DONE: 'step_done',
  CLINIC_OPENED: 'clinic_opened',
  CLINIC_CLOSED: 'clinic_closed',
  EMERGENCY: 'emergency',
  GENERAL: 'general'
};

// Priority levels
const PRIORITY_LEVELS = {
  URGENT: 'urgent',
  HIGH: 'high',
  NORMAL: 'normal',
  LOW: 'low'
};

export async function onRequest(context) {
  const { request, env } = context;
  
  // Handle CORS preflight
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type'
      }
    });
  }
  
  if (request.method !== 'POST') {
    return jsonResponse({
      success: false,
      error: 'Method not allowed'
    }, 405);
  }
  
  try {
    const body = await request.json();
    const {
      recipient_id,
      recipient_type = 'patient', // patient, staff, admin, broadcast
      type,
      title,
      message,
      priority = PRIORITY_LEVELS.NORMAL,
      data = {},
      channels = ['sse', 'browser'] // sse, browser, sound, vibrate
    } = body;
    
    // Validate required fields
    if (!recipient_id && recipient_type !== 'broadcast') {
      return jsonResponse({
        success: false,
        error: 'recipient_id is required for non-broadcast notifications'
      }, 400);
    }
    
    if (!type || !title || !message) {
      return jsonResponse({
        success: false,
        error: 'type, title, and message are required'
      }, 400);
    }
    
    // Create notification object
    const notification = {
      id: `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      recipient_id,
      recipient_type,
      type,
      title,
      message,
      priority,
      data,
      channels,
      timestamp: new Date().toISOString(),
      read: false,
      delivered: false
    };
    
    // Store notification in KV
    const kv = env.KV_ADMIN;
    
    if (recipient_type === 'broadcast') {
      // Store as broadcast notification
      const broadcastKey = `notification:broadcast:${notification.id}`;
      await kv.put(broadcastKey, JSON.stringify(notification), {
        expirationTtl: 86400 // 24 hours
      });
      
      // Add to broadcast list
      const broadcastListKey = 'notification:broadcast:list';
      const broadcastList = await kv.get(broadcastListKey, { type: 'json' }) || [];
      broadcastList.push({
        id: notification.id,
        timestamp: notification.timestamp,
        type: notification.type,
        priority: notification.priority
      });
      
      // Keep only last 100 broadcasts
      if (broadcastList.length > 100) {
        broadcastList.shift();
      }
      
      await kv.put(broadcastListKey, JSON.stringify(broadcastList), {
        expirationTtl: 86400
      });
    } else {
      // Store as individual notification
      const notificationKey = `notification:${recipient_type}:${recipient_id}:${notification.id}`;
      await kv.put(notificationKey, JSON.stringify(notification), {
        expirationTtl: 86400 // 24 hours
      });
      
      // Add to user's notification list
      const userListKey = `notification:${recipient_type}:${recipient_id}:list`;
      const userNotifications = await kv.get(userListKey, { type: 'json' }) || [];
      userNotifications.push({
        id: notification.id,
        timestamp: notification.timestamp,
        type: notification.type,
        priority: notification.priority,
        read: false
      });
      
      // Keep only last 50 notifications per user
      if (userNotifications.length > 50) {
        userNotifications.shift();
      }
      
      await kv.put(userListKey, JSON.stringify(userNotifications), {
        expirationTtl: 86400
      });
    }
    
    // Trigger SSE broadcast if enabled
    if (channels.includes('sse')) {
      // Store in SSE queue for real-time delivery
      const sseQueueKey = `sse:queue:${recipient_type}:${recipient_id || 'all'}`;
      const sseQueue = await kv.get(sseQueueKey, { type: 'json' }) || [];
      sseQueue.push(notification);
      
      // Keep only last 10 pending SSE messages
      if (sseQueue.length > 10) {
        sseQueue.shift();
      }
      
      await kv.put(sseQueueKey, JSON.stringify(sseQueue), {
        expirationTtl: 300 // 5 minutes
      });
    }
    
    // Log notification for analytics
    const logKey = `notification:log:${new Date().toISOString().split('T')[0]}`;
    const dailyLog = await kv.get(logKey, { type: 'json' }) || [];
    dailyLog.push({
      id: notification.id,
      timestamp: notification.timestamp,
      recipient_type,
      type,
      priority
    });
    
    await kv.put(logKey, JSON.stringify(dailyLog), {
      expirationTtl: 604800 // 7 days
    });
    
    return jsonResponse({
      success: true,
      notification_id: notification.id,
      recipient_id,
      recipient_type,
      type,
      priority,
      timestamp: notification.timestamp,
      channels_enabled: channels
    });
    
  } catch (error) {
    console.error('Notification send error:', error);
    return jsonResponse({
      success: false,
      error: error.message
    }, 500);
  }
}


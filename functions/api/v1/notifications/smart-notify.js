// Smart Notification System with AI-like Predictions
// POST /api/v1/notifications/smart-notify
// Sends intelligent notifications with wait time predictions and multi-level alerts

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

// Clinic names in Arabic
const CLINIC_NAMES = {
  'lab': 'المختبر',
  'xray': 'الأشعة',
  'eyes': 'العيون',
  'internal': 'الباطنية',
  'ent': 'الأنف والأذن والحنجرة',
  'derma': 'الجلدية',
  'ortho': 'العظام',
  'dental': 'الأسنان',
  'internal_women': 'الباطنية - نساء',
  'derma_women': 'الجلدية - نساء',
  'eyes_women': 'العيون - نساء'
};

// Average service time per clinic (in minutes)
const AVG_SERVICE_TIME = {
  'lab': 5,
  'xray': 8,
  'eyes': 10,
  'internal': 15,
  'ent': 12,
  'derma': 10,
  'ortho': 12,
  'dental': 15,
  'internal_women': 15,
  'derma_women': 10,
  'eyes_women': 10
};

// Calculate estimated wait time
function calculateWaitTime(position, clinic) {
  const avgTime = AVG_SERVICE_TIME[clinic] || 10;
  const estimatedMinutes = (position - 1) * avgTime;
  return estimatedMinutes;
}

// Format wait time in Arabic
function formatWaitTime(minutes) {
  if (minutes < 1) return 'أقل من دقيقة';
  if (minutes === 1) return 'دقيقة واحدة';
  if (minutes === 2) return 'دقيقتان';
  if (minutes <= 10) return `${minutes} دقائق`;
  if (minutes <= 30) return `حوالي ${Math.round(minutes / 5) * 5} دقيقة`;
  if (minutes <= 60) return `حوالي ${Math.round(minutes / 10) * 10} دقيقة`;
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  if (remainingMinutes === 0) return `${hours} ساعة`;
  return `${hours} ساعة و ${remainingMinutes} دقيقة`;
}

// Helper function to send notification
async function sendNotification(env, recipient_id, notification) {
  const kv = env.KV_ADMIN;
  
  const notificationObj = {
    id: `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    recipient_id,
    recipient_type: 'patient',
    timestamp: new Date().toISOString(),
    read: false,
    delivered: false,
    ...notification
  };
  
  // Store notification
  const notificationKey = `notification:patient:${recipient_id}:${notificationObj.id}`;
  await kv.put(notificationKey, JSON.stringify(notificationObj), {
    expirationTtl: 86400
  });
  
  // Add to user's list
  const userListKey = `notification:patient:${recipient_id}:list`;
  const userNotifications = await kv.get(userListKey, { type: 'json' }) || [];
  userNotifications.push({
    id: notificationObj.id,
    timestamp: notificationObj.timestamp,
    type: notificationObj.type,
    priority: notificationObj.priority,
    read: false
  });
  
  if (userNotifications.length > 100) {
    userNotifications.shift();
  }
  
  await kv.put(userListKey, JSON.stringify(userNotifications), {
    expirationTtl: 86400
  });
  
  // Add to SSE queue for real-time delivery
  const sseQueueKey = `sse:queue:patient:${recipient_id}`;
  const sseQueue = await kv.get(sseQueueKey, { type: 'json' }) || [];
  sseQueue.push(notificationObj);
  
  if (sseQueue.length > 20) {
    sseQueue.shift();
  }
  
  await kv.put(sseQueueKey, JSON.stringify(sseQueue), {
    expirationTtl: 600 // 10 minutes
  });
  
  return notificationObj;
}

export async function onRequest(context) {
  const { request, env } = context;
  
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
    const { clinic, user_id } = body;
    
    if (!clinic) {
      return jsonResponse({
        success: false,
        error: 'clinic is required'
      }, 400);
    }
    
    const kv = env.KV_QUEUES;
    const listKey = `queue:list:${clinic}`;
    const statusKey = `queue:status:${clinic}`;
    
    // Get queue list and status
    const queueList = await kv.get(listKey, { type: 'json' }) || [];
    const status = await kv.get(statusKey, { type: 'json' }) || { current: null, served: [] };
    
    const notifications_sent = [];
    const clinic_name = CLINIC_NAMES[clinic] || clinic;
    
    // If user_id is provided, send notification only for that user
    if (user_id) {
      const userIndex = queueList.findIndex(item => item.user === user_id);
      if (userIndex === -1) {
        return jsonResponse({
          success: false,
          error: 'User not found in queue'
        }, 404);
      }
      
      const position = userIndex + 1;
      const queueItem = queueList[userIndex];
      const waitTime = calculateWaitTime(position, clinic);
      const waitTimeText = formatWaitTime(waitTime);
      
      // Send appropriate notification based on position
      let notification;
      
      if (position === 1) {
        // YOUR TURN - URGENT
        notification = await sendNotification(env, user_id, {
          type: 'your_turn',
          title: '🔔 حان دورك الآن!',
          message: `حان دورك في ${clinic_name}. رقمك: ${queueItem.number}.\n\n⚡ توجه للعيادة فوراً`,
          priority: 'urgent',
          data: {
            clinic,
            clinic_name,
            number: queueItem.number,
            position: 1,
            wait_time_minutes: 0,
            wait_time_text: 'الآن',
            action_required: true,
            action_text: 'توجه للعيادة'
          },
          channels: ['sse', 'browser', 'sound', 'vibrate']
        });
      } else if (position === 2) {
        // NEXT IN LINE - VERY HIGH
        notification = await sendNotification(env, user_id, {
          type: 'next_in_line',
          title: '⏰ أنت التالي!',
          message: `أنت التالي في ${clinic_name}. رقمك: ${queueItem.number}.\n\n📍 كن جاهزاً - الوقت المتوقع: ${waitTimeText}`,
          priority: 'urgent',
          data: {
            clinic,
            clinic_name,
            number: queueItem.number,
            position: 2,
            wait_time_minutes: waitTime,
            wait_time_text: waitTimeText,
            action_required: true,
            action_text: 'كن جاهزاً'
          },
          channels: ['sse', 'browser', 'sound', 'vibrate']
        });
      } else if (position === 3) {
        // VERY NEAR - HIGH
        notification = await sendNotification(env, user_id, {
          type: 'very_near',
          title: '⏳ اقترب دورك جداً',
          message: `موقعك: ${position} في ${clinic_name}. رقمك: ${queueItem.number}.\n\n⏱️ الوقت المتوقع: ${waitTimeText}\n📍 ابق قريباً من العيادة`,
          priority: 'high',
          data: {
            clinic,
            clinic_name,
            number: queueItem.number,
            position,
            wait_time_minutes: waitTime,
            wait_time_text: waitTimeText,
            action_required: true,
            action_text: 'ابق قريباً'
          },
          channels: ['sse', 'browser', 'sound']
        });
      } else if (position <= 5) {
        // NEAR TURN - HIGH
        notification = await sendNotification(env, user_id, {
          type: 'near_turn',
          title: '⏰ اقترب دورك',
          message: `موقعك: ${position} في ${clinic_name}. رقمك: ${queueItem.number}.\n\n⏱️ الوقت المتوقع: ${waitTimeText}\n📍 توجه نحو منطقة الانتظار`,
          priority: 'high',
          data: {
            clinic,
            clinic_name,
            number: queueItem.number,
            position,
            wait_time_minutes: waitTime,
            wait_time_text: waitTimeText,
            people_ahead: position - 1
          },
          channels: ['sse', 'browser', 'sound']
        });
      } else if (position <= 10) {
        // MODERATE WAIT - NORMAL
        notification = await sendNotification(env, user_id, {
          type: 'queue_update',
          title: '📊 تحديث موقعك',
          message: `موقعك: ${position} من ${queueList.length} في ${clinic_name}.\n\n⏱️ الوقت المتوقع: ${waitTimeText}\n💡 يمكنك الانتظار في المنطقة المخصصة`,
          priority: 'normal',
          data: {
            clinic,
            clinic_name,
            number: queueItem.number,
            position,
            total: queueList.length,
            wait_time_minutes: waitTime,
            wait_time_text: waitTimeText,
            people_ahead: position - 1
          },
          channels: ['sse', 'browser']
        });
      } else {
        // LONG WAIT - LOW
        notification = await sendNotification(env, user_id, {
          type: 'queue_update',
          title: '📊 موقعك في الطابور',
          message: `موقعك: ${position} من ${queueList.length} في ${clinic_name}.\n\n⏱️ الوقت المتوقع: ${waitTimeText}\n💡 سنبلغك عند اقتراب دورك`,
          priority: 'low',
          data: {
            clinic,
            clinic_name,
            number: queueItem.number,
            position,
            total: queueList.length,
            wait_time_minutes: waitTime,
            wait_time_text: waitTimeText,
            people_ahead: position - 1
          },
          channels: ['sse']
        });
      }
      
      return jsonResponse({
        success: true,
        clinic,
        user_id,
        notification_sent: true,
        position,
        wait_time_minutes: waitTime,
        wait_time_text: waitTimeText,
        notification_id: notification.id,
        timestamp: new Date().toISOString()
      });
    }
    
    // Send notifications to all users in queue
    for (let i = 0; i < queueList.length; i++) {
      const queueItem = queueList[i];
      const position = i + 1;
      const user = queueItem.user;
      const waitTime = calculateWaitTime(position, clinic);
      const waitTimeText = formatWaitTime(waitTime);
      
      // Skip if already served
      if (status.served && status.served.includes(queueItem.number)) {
        continue;
      }
      
      // Skip if currently being served
      if (status.current === queueItem.number) {
        continue;
      }
      
      let notification;
      
      if (position === 1) {
        notification = await sendNotification(env, user, {
          type: 'your_turn',
          title: '🔔 حان دورك الآن!',
          message: `حان دورك في ${clinic_name}. رقمك: ${queueItem.number}.\n\n⚡ توجه للعيادة فوراً`,
          priority: 'urgent',
          data: {
            clinic,
            clinic_name,
            number: queueItem.number,
            position: 1,
            wait_time_minutes: 0,
            wait_time_text: 'الآن'
          },
          channels: ['sse', 'browser', 'sound', 'vibrate']
        });
      } else if (position === 2) {
        notification = await sendNotification(env, user, {
          type: 'next_in_line',
          title: '⏰ أنت التالي!',
          message: `أنت التالي في ${clinic_name}. رقمك: ${queueItem.number}.\n\n📍 كن جاهزاً - الوقت المتوقع: ${waitTimeText}`,
          priority: 'urgent',
          data: {
            clinic,
            clinic_name,
            number: queueItem.number,
            position: 2,
            wait_time_minutes: waitTime,
            wait_time_text: waitTimeText
          },
          channels: ['sse', 'browser', 'sound', 'vibrate']
        });
      } else if (position === 3) {
        notification = await sendNotification(env, user, {
          type: 'very_near',
          title: '⏳ اقترب دورك جداً',
          message: `موقعك: ${position} في ${clinic_name}.\n\n⏱️ الوقت المتوقع: ${waitTimeText}`,
          priority: 'high',
          data: {
            clinic,
            clinic_name,
            number: queueItem.number,
            position,
            wait_time_minutes: waitTime,
            wait_time_text: waitTimeText
          },
          channels: ['sse', 'browser', 'sound']
        });
      } else if (position <= 5) {
        notification = await sendNotification(env, user, {
          type: 'near_turn',
          title: '⏰ اقترب دورك',
          message: `موقعك: ${position} في ${clinic_name}.\n\n⏱️ الوقت المتوقع: ${waitTimeText}`,
          priority: 'high',
          data: {
            clinic,
            clinic_name,
            number: queueItem.number,
            position,
            wait_time_minutes: waitTime,
            wait_time_text: waitTimeText
          },
          channels: ['sse', 'browser', 'sound']
        });
      } else if (position <= 10) {
        notification = await sendNotification(env, user, {
          type: 'queue_update',
          title: '📊 تحديث موقعك',
          message: `موقعك: ${position} من ${queueList.length} في ${clinic_name}.\n\n⏱️ الوقت المتوقع: ${waitTimeText}`,
          priority: 'normal',
          data: {
            clinic,
            clinic_name,
            number: queueItem.number,
            position,
            total: queueList.length,
            wait_time_minutes: waitTime,
            wait_time_text: waitTimeText
          },
          channels: ['sse', 'browser']
        });
      } else if (position % 5 === 0) {
        // Send update every 5 positions for long queues
        notification = await sendNotification(env, user, {
          type: 'queue_update',
          title: '📊 موقعك في الطابور',
          message: `موقعك: ${position} من ${queueList.length} في ${clinic_name}.\n\n⏱️ الوقت المتوقع: ${waitTimeText}`,
          priority: 'low',
          data: {
            clinic,
            clinic_name,
            number: queueItem.number,
            position,
            total: queueList.length,
            wait_time_minutes: waitTime,
            wait_time_text: waitTimeText
          },
          channels: ['sse']
        });
      }
      
      if (notification) {
        notifications_sent.push({
          user,
          position,
          type: notification.type,
          wait_time: waitTimeText
        });
      }
    }
    
    return jsonResponse({
      success: true,
      clinic,
      clinic_name,
      queue_size: queueList.length,
      notifications_sent: notifications_sent.length,
      details: notifications_sent,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Smart notify error:', error);
    return jsonResponse({
      success: false,
      error: error.message
    }, 500);
  }
}


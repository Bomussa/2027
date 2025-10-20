// Automatic Queue Notification System
// POST /api/v1/queue/auto-notify
// Automatically sends notifications based on queue position

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
  
  if (userNotifications.length > 50) {
    userNotifications.shift();
  }
  
  await kv.put(userListKey, JSON.stringify(userNotifications), {
    expirationTtl: 86400
  });
  
  // Add to SSE queue for real-time delivery
  const sseQueueKey = `sse:queue:patient:${recipient_id}`;
  const sseQueue = await kv.get(sseQueueKey, { type: 'json' }) || [];
  sseQueue.push(notificationObj);
  
  if (sseQueue.length > 10) {
    sseQueue.shift();
  }
  
  await kv.put(sseQueueKey, JSON.stringify(sseQueue), {
    expirationTtl: 300
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
    const { clinic } = body;
    
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
    
    // Process each person in queue
    for (let i = 0; i < queueList.length; i++) {
      const queueItem = queueList[i];
      const position = i + 1;
      const user = queueItem.user;
      
      // Skip if already served
      if (status.served && status.served.includes(queueItem.number)) {
        continue;
      }
      
      // Skip if currently being served
      if (status.current === queueItem.number) {
        continue;
      }
      
      // Position 1: YOUR TURN (Urgent)
      if (position === 1) {
        const notification = await sendNotification(env, user, {
          type: 'your_turn',
          title: '🔔 حان دورك الآن!',
          message: `حان دورك في ${getClinicName(clinic)}. رقمك: ${queueItem.number}. توجه للعيادة فوراً`,
          priority: 'urgent',
          data: {
            clinic,
            clinic_name: getClinicName(clinic),
            number: queueItem.number,
            position: 1
          },
          channels: ['sse', 'browser', 'sound', 'vibrate']
        });
        
        notifications_sent.push({
          user,
          type: 'your_turn',
          position: 1
        });
      }
      // Position 2-3: NEAR TURN (High)
      else if (position === 2 || position === 3) {
        const notification = await sendNotification(env, user, {
          type: 'near_turn',
          title: '⏰ اقترب دورك',
          message: `اقترب دورك في ${getClinicName(clinic)}. موقعك الحالي: ${position}`,
          priority: 'high',
          data: {
            clinic,
            clinic_name: getClinicName(clinic),
            number: queueItem.number,
            position
          },
          channels: ['sse', 'browser', 'sound']
        });
        
        notifications_sent.push({
          user,
          type: 'near_turn',
          position
        });
      }
      // Position 4-10: QUEUE UPDATE (Normal)
      else if (position <= 10) {
        const notification = await sendNotification(env, user, {
          type: 'queue_update',
          title: '📊 تحديث الطابور',
          message: `موقعك في ${getClinicName(clinic)}: ${position} من ${queueList.length} منتظر`,
          priority: 'normal',
          data: {
            clinic,
            clinic_name: getClinicName(clinic),
            number: queueItem.number,
            position,
            total: queueList.length
          },
          channels: ['sse']
        });
        
        notifications_sent.push({
          user,
          type: 'queue_update',
          position
        });
      }
      // Position 11+: LOW PRIORITY UPDATE (Low)
      else {
        const notification = await sendNotification(env, user, {
          type: 'queue_update',
          title: '📊 تحديث الطابور',
          message: `موقعك في ${getClinicName(clinic)}: ${position} من ${queueList.length} منتظر`,
          priority: 'low',
          data: {
            clinic,
            clinic_name: getClinicName(clinic),
            number: queueItem.number,
            position,
            total: queueList.length
          },
          channels: ['sse']
        });
        
        notifications_sent.push({
          user,
          type: 'queue_update',
          position
        });
      }
    }
    
    return jsonResponse({
      success: true,
      clinic,
      queue_size: queueList.length,
      notifications_sent: notifications_sent.length,
      details: notifications_sent,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Auto-notify error:', error);
    return jsonResponse({
      success: false,
      error: error.message
    }, 500);
  }
}

// Helper function to get clinic display name
function getClinicName(clinic) {
  const names = {
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
  
  return names[clinic] || clinic;
}


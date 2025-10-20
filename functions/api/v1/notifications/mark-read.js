// Advanced Notification System - Mark as Read
// POST /api/v1/notifications/mark-read

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
      recipient_type = 'patient',
      notification_ids = [], // Array of notification IDs to mark as read
      mark_all = false // Mark all as read
    } = body;
    
    if (!recipient_id) {
      return jsonResponse({
        success: false,
        error: 'recipient_id is required'
      }, 400);
    }
    
    const kv = env.KV_ADMIN;
    
    // Get user's notification list
    const userListKey = `notification:${recipient_type}:${recipient_id}:list`;
    const notificationList = await kv.get(userListKey, { type: 'json' }) || [];
    
    let updated_count = 0;
    
    if (mark_all) {
      // Mark all as read
      for (const item of notificationList) {
        if (!item.read) {
          const notificationKey = `notification:${recipient_type}:${recipient_id}:${item.id}`;
          const notification = await kv.get(notificationKey, { type: 'json' });
          
          if (notification) {
            notification.read = true;
            notification.read_at = new Date().toISOString();
            await kv.put(notificationKey, JSON.stringify(notification), {
              expirationTtl: 86400
            });
            
            item.read = true;
            updated_count++;
          }
        }
      }
    } else {
      // Mark specific notifications as read
      for (const notif_id of notification_ids) {
        const notificationKey = `notification:${recipient_type}:${recipient_id}:${notif_id}`;
        const notification = await kv.get(notificationKey, { type: 'json' });
        
        if (notification && !notification.read) {
          notification.read = true;
          notification.read_at = new Date().toISOString();
          await kv.put(notificationKey, JSON.stringify(notification), {
            expirationTtl: 86400
          });
          
          // Update in list
          const listItem = notificationList.find(n => n.id === notif_id);
          if (listItem) {
            listItem.read = true;
          }
          
          updated_count++;
        }
      }
    }
    
    // Update the notification list
    await kv.put(userListKey, JSON.stringify(notificationList), {
      expirationTtl: 86400
    });
    
    return jsonResponse({
      success: true,
      recipient_id,
      recipient_type,
      updated_count,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Mark read error:', error);
    return jsonResponse({
      success: false,
      error: error.message
    }, 500);
  }
}


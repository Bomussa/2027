/**
 * Notification Dispatch Endpoint
 * POST /api/v1/notify/dispatch
 * Sends notifications to patients via webhook
 */

export async function onRequestPost(context) {
  const { request, env } = context;
  
  try {
    const body = await request.json();
    const { type, pin, clinic, message, priority = 'normal' } = body;

    if (!type || !pin || !clinic) {
      return jsonResponse({ error: 'Missing required fields: type, pin, clinic' }, 400);
    }

    const notification = {
      id: `notify_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type,
      pin,
      clinic,
      message,
      priority,
      timestamp: new Date().toISOString()
    };

    // Store notification in KV_EVENTS
    const notifyKey = `notify:${clinic}:${pin}:${Date.now()}`;
    await env.KV_EVENTS.put(notifyKey, JSON.stringify(notification), {
      expirationTtl: 24 * 60 * 60 // 24 hours
    });

    // Send to external webhook if configured
    if (env.NOTIFY_KEY && env.NOTIFY_KEY.startsWith('http')) {
      try {
        await fetch(env.NOTIFY_KEY, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(notification)
        });
      } catch (webhookError) {
        console.error('Webhook delivery failed:', webhookError);
        // Continue even if webhook fails
      }
    }

    return jsonResponse({
      success: true,
      notification_id: notification.id,
      delivered: true,
      timestamp: new Date().toISOString()
    }, 200);

  } catch (error) {
    return jsonResponse({ error: error.message }, 500);
  }
}

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Cache-Control': 'no-cache, no-store, must-revalidate'
    }
  });
}


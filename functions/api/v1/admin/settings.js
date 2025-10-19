/**
 * Admin Settings Endpoint
 * GET /api/v1/admin/settings - Get all settings
 * PUT /api/v1/admin/settings - Update settings
 */

export async function onRequestGet(context) {
  const { request, env } = context;
  
  try {
    // TODO: Add JWT authentication check

    // Get all settings from KV_ADMIN
    const settings = await env.KV_ADMIN.get('system_settings', { type: 'json' });

    if (!settings) {
      // Return default settings
      const defaultSettings = getDefaultSettings();
      await env.KV_ADMIN.put('system_settings', JSON.stringify(defaultSettings));
      return jsonResponse(defaultSettings, 200);
    }

    return jsonResponse(settings, 200);

  } catch (error) {
    return jsonResponse({ error: error.message }, 500);
  }
}

export async function onRequestPut(context) {
  const { request, env } = context;
  
  try {
    // TODO: Add JWT authentication check

    const body = await request.json();

    // Get current settings
    let settings = await env.KV_ADMIN.get('system_settings', { type: 'json' });
    
    if (!settings) {
      settings = getDefaultSettings();
    }

    // Update settings
    const updatedSettings = {
      ...settings,
      ...body,
      updated_at: new Date().toISOString()
    };

    // Validate critical settings
    if (updatedSettings.pin_start < 1 || updatedSettings.pin_end > 99) {
      return jsonResponse({ error: 'Invalid PIN range' }, 400);
    }

    // Save updated settings
    await env.KV_ADMIN.put('system_settings', JSON.stringify(updatedSettings));

    // Log settings change
    await logEvent(env.KV_EVENTS, {
      type: 'SETTINGS_UPDATED',
      changes: body,
      timestamp: new Date().toISOString()
    });

    return jsonResponse({
      success: true,
      settings: updatedSettings,
      message: 'تم تحديث الإعدادات بنجاح'
    }, 200);

  } catch (error) {
    return jsonResponse({ error: error.message }, 500);
  }
}

function getDefaultSettings() {
  return {
    pin_start: 1,
    pin_end: 20,
    pin_reserve_start: 21,
    pin_reserve_end: 30,
    pin_reset_time: '00:00',
    timezone: 'Asia/Qatar',
    queue_interval_seconds: 600,
    allow_dynamic_routes: true,
    path_weights: {
      W_idle: 1.5,
      W_spare: 0.5,
      W_load: 0.8,
      W_wait: 0.7,
      base_weight: 1.0,
      tie_breakers: ['empty_queue', 'queue_length', 'avg_wait', 'alpha']
    },
    notifications_enabled: true,
    sse_enabled: true,
    rate_limit_rpm: 60,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };
}

async function logEvent(kvEvents, event) {
  try {
    const eventKey = `event:admin:${Date.now()}`;
    await kvEvents.put(eventKey, JSON.stringify(event), {
      expirationTtl: 30 * 24 * 60 * 60 // 30 days
    });
  } catch (error) {
    console.error('Event logging failed:', error);
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


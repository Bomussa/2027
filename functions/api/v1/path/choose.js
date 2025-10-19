/**
 * Dynamic Path Engine - Choose Clinic
 * GET /api/v1/path/choose
 * GET /api/v1/path/choose?clinic=<name>
 * 
 * Features:
 * - Dynamic clinic assignment based on weights and load
 * - Sticky route (same session always gets same clinic)
 * - Empty clinics first priority
 * - Special handling for women's clinics (no PIN)
 */

// List of all clinics
const CLINICS = [
  "المختبر", "الأشعة",
  "عيادة العيون", "عيادة الباطنية", "عيادة الأنف والأذن والحنجرة", "عيادة الجراحة العامة",
  "عيادة الأسنان", "عيادة النفسية", "عيادة الجلدية", "عيادة العظام والمفاصل",
  "غرفة القياسات الحيوية", "غرفة تخطيط القلب", "غرفة قياس السمع",
  "عيادة الباطنية (نساء)", "عيادة الجلدية (نساء)", "عيادة العيون (نساء)"
];

// Women's clinics (no PIN required)
const WOMEN_CLINICS = [
  "عيادة الباطنية (نساء)",
  "عيادة الجلدية (نساء)",
  "عيادة العيون (نساء)"
];

// Default weights
const DEFAULT_WEIGHTS = {
  W_idle: 1.5,
  W_spare: 0.5,
  W_load: 0.8,
  W_wait: 0.7,
  base_weight: 1.0,
  tie_breakers: ["empty_queue", "queue_length", "avg_wait", "alpha"]
};

export async function onRequestGet(context) {
  const { request, env } = context;
  
  try {
    const url = new URL(request.url);
    const requestedClinic = url.searchParams.get('clinic');
    const sessionId = url.searchParams.get('session_id') || generateSessionId();
    
    const now = new Date();
    const qatarTime = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Qatar' }));
    const dateKey = qatarTime.toISOString().split('T')[0];

    // Check if session already has a sticky route
    const stickyRouteKey = `route:${sessionId}`;
    const existingRoute = await env.KV_LOCKS.get(stickyRouteKey, { type: 'json' });
    
    if (existingRoute && existingRoute.clinic && existingRoute.date === dateKey) {
      // Return existing sticky route
      return jsonResponse({
        success: true,
        clinic: existingRoute.clinic,
        session_id: sessionId,
        sticky: true,
        no_pin: WOMEN_CLINICS.includes(existingRoute.clinic),
        message: 'مسار ثابت محفوظ',
        timestamp: new Date().toISOString()
      });
    }

    // If specific clinic requested
    if (requestedClinic) {
      if (!CLINICS.includes(requestedClinic)) {
        return jsonResponse({ error: 'Invalid clinic name' }, 400);
      }
      
      // Save sticky route
      await env.KV_LOCKS.put(stickyRouteKey, JSON.stringify({
        clinic: requestedClinic,
        date: dateKey,
        sticky: true,
        created_at: new Date().toISOString()
      }), {
        expirationTtl: 24 * 60 * 60 // 24 hours
      });
      
      return jsonResponse({
        success: true,
        clinic: requestedClinic,
        session_id: sessionId,
        sticky: true,
        no_pin: WOMEN_CLINICS.includes(requestedClinic),
        timestamp: new Date().toISOString()
      });
    }

    // Auto-assign based on weights and load
    const weights = await getWeights(env);
    const clinicScores = await calculateClinicScores(env, dateKey, weights);
    
    // Sort by score (descending)
    clinicScores.sort((a, b) => {
      if (Math.abs(b.score - a.score) > 0.001) {
        return b.score - a.score;
      }
      
      // Apply tie-breakers
      for (const tieBreaker of weights.tie_breakers) {
        if (tieBreaker === 'empty_queue') {
          if (a.is_empty !== b.is_empty) return b.is_empty ? 1 : -1;
        } else if (tieBreaker === 'queue_length') {
          if (a.queue_length !== b.queue_length) return a.queue_length - b.queue_length;
        } else if (tieBreaker === 'avg_wait') {
          if (a.avg_wait !== b.avg_wait) return a.avg_wait - b.avg_wait;
        } else if (tieBreaker === 'alpha') {
          return a.clinic.localeCompare(b.clinic, 'ar');
        }
      }
      
      return 0;
    });

    const selectedClinic = clinicScores[0].clinic;
    
    // Save sticky route
    await env.KV_LOCKS.put(stickyRouteKey, JSON.stringify({
      clinic: selectedClinic,
      date: dateKey,
      sticky: true,
      created_at: new Date().toISOString()
    }), {
      expirationTtl: 24 * 60 * 60
    });

    // Log event
    await logEvent(env.KV_EVENTS, {
      type: 'PATH_ASSIGNED',
      session_id: sessionId,
      clinic: selectedClinic,
      score: clinicScores[0].score,
      date: dateKey,
      timestamp: new Date().toISOString()
    });

    return jsonResponse({
      success: true,
      clinic: selectedClinic,
      session_id: sessionId,
      sticky: true,
      no_pin: WOMEN_CLINICS.includes(selectedClinic),
      score_breakdown: clinicScores[0],
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    return jsonResponse({ error: error.message }, 500);
  }
}

async function getWeights(env) {
  try {
    const storedWeights = await env.KV_ADMIN.get('clinic_weights', { type: 'json' });
    return storedWeights || DEFAULT_WEIGHTS;
  } catch {
    return DEFAULT_WEIGHTS;
  }
}

async function calculateClinicScores(env, dateKey, weights) {
  const scores = [];
  
  for (const clinic of CLINICS) {
    const queueKey = `queue:${clinic}:${dateKey}`;
    const queueData = await env.KV_QUEUES.get(queueKey, { type: 'json' });
    
    const queueLength = queueData?.queue?.length || 0;
    const isEmptyQueue = queueLength === 0;
    const avgWaitSeconds = queueData?.avg_wait_seconds || 0;
    
    // Get PIN data for spare ratio
    const pinsKey = `pins:${clinic}:${dateKey}`;
    const pinsData = await env.KV_PINS.get(pinsKey, { type: 'json' });
    const totalPins = 30;
    const usedPins = pinsData?.taken?.length || 0;
    const spareRatio = (totalPins - usedPins) / totalPins;
    const loadRatio = usedPins / totalPins;
    
    // Normalize avg wait (assume max 30 minutes = 1800 seconds)
    const avgWaitNorm = Math.min(avgWaitSeconds / 1800, 1);
    
    // Calculate score
    const score = weights.base_weight
      + weights.W_idle * (isEmptyQueue ? 1 : 0)
      + weights.W_spare * spareRatio
      - weights.W_load * loadRatio
      - weights.W_wait * avgWaitNorm;
    
    scores.push({
      clinic,
      score,
      is_empty: isEmptyQueue,
      queue_length: queueLength,
      avg_wait: avgWaitSeconds,
      spare_ratio: spareRatio,
      load_ratio: loadRatio
    });
  }
  
  return scores;
}

function generateSessionId() {
  return 'MMC' + Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
}

async function logEvent(kvEvents, event) {
  try {
    const eventKey = `event:${Date.now()}:${Math.random().toString(36).substr(2, 9)}`;
    await kvEvents.put(eventKey, JSON.stringify(event), {
      expirationTtl: 7 * 24 * 60 * 60
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


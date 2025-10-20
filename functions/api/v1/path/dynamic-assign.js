// Dynamic Path Assignment with Intelligent Weight-Based Routing
// POST /api/v1/path/dynamic-assign
// Assigns optimal clinic path based on real-time queue weights and load balancing

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

// Exam type definitions with required clinics
const EXAM_TYPES = {
  'recruitment': {
    name: 'فحص التجنيد',
    clinics: ['lab', 'xray', 'eyes', 'internal', 'ent', 'derma'],
    priority_weights: {
      'lab': 1.0,      // Must be first
      'xray': 1.0,     // Must be second
      'eyes': 0.8,
      'internal': 1.2, // Higher priority (longer service time)
      'ent': 0.9,
      'derma': 0.7
    }
  },
  'basic': {
    name: 'فحص أساسي',
    clinics: ['lab', 'xray', 'internal'],
    priority_weights: {
      'lab': 1.0,
      'xray': 1.0,
      'internal': 1.2
    }
  },
  'full': {
    name: 'فحص شامل',
    clinics: ['lab', 'xray', 'eyes', 'internal', 'ent', 'derma', 'ortho', 'dental'],
    priority_weights: {
      'lab': 1.0,
      'xray': 1.0,
      'eyes': 0.8,
      'internal': 1.2,
      'ent': 0.9,
      'derma': 0.7,
      'ortho': 1.0,
      'dental': 1.1
    }
  },
  'women': {
    name: 'فحص نساء',
    clinics: ['lab', 'xray', 'internal_women', 'derma_women', 'eyes_women'],
    priority_weights: {
      'lab': 1.0,
      'xray': 1.0,
      'internal_women': 1.2,
      'derma_women': 0.7,
      'eyes_women': 0.8
    },
    no_pin: true
  },
  'specialized': {
    name: 'فحص متخصص',
    clinics: ['lab', 'xray', 'internal', 'ortho'],
    priority_weights: {
      'lab': 1.0,
      'xray': 1.0,
      'internal': 1.2,
      'ortho': 1.0
    }
  }
};

// Calculate weighted score for clinic routing
function calculateClinicScore(queueLength, priorityWeight, avgServiceTime) {
  // Score = (queue_length * priority_weight * avg_service_time) / 10
  // Lower score = better choice
  const baseScore = queueLength * priorityWeight;
  const timeAdjusted = baseScore * (avgServiceTime / 10);
  return timeAdjusted;
}

// Get average service time per clinic (in minutes)
function getAvgServiceTime(clinic) {
  const times = {
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
  return times[clinic] || 10;
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
    const { user_id, exam_type } = body;
    
    if (!user_id || !exam_type) {
      return jsonResponse({
        success: false,
        error: 'user_id and exam_type are required'
      }, 400);
    }
    
    // Check if exam type is valid
    if (!EXAM_TYPES[exam_type]) {
      return jsonResponse({
        success: false,
        error: `Invalid exam_type. Valid types: ${Object.keys(EXAM_TYPES).join(', ')}`
      }, 400);
    }
    
    const kv = env.KV_ADMIN;
    const pathKey = `path:${user_id}:${exam_type}`;
    
    // Check if path already exists (Sticky - ALWAYS return existing path)
    const existingPath = await kv.get(pathKey, { type: 'json' });
    if (existingPath) {
      return jsonResponse({
        success: true,
        sticky: true,
        user_id,
        exam_type,
        exam_name: EXAM_TYPES[exam_type].name,
        session_code: existingPath.session_code,
        clinic_path: existingPath.clinic_path,
        clinic_names: existingPath.clinic_names,
        weights_used: existingPath.weights,
        scores_calculated: existingPath.scores,
        total_estimated_time_minutes: existingPath.total_estimated_time_minutes,
        total_estimated_time_text: formatTime(existingPath.total_estimated_time_minutes),
        no_pin: existingPath.no_pin,
        created_at: existingPath.created_at,
        algorithm: existingPath.algorithm_version,
        message: '✅ المسار محفوظ مسبقاً - تم حسابه مرة واحدة في بداية الفحص'
      });
    }
    
    // Get exam configuration
    const examConfig = EXAM_TYPES[exam_type];
    const requiredClinics = examConfig.clinics;
    const priorityWeights = examConfig.priority_weights;
    
    // Get current queue lengths for all clinics
    const queueKV = env.KV_QUEUES;
    const queueWeights = {};
    const queueScores = {};
    
    for (const clinic of requiredClinics) {
      const listKey = `queue:list:${clinic}`;
      const queueList = await queueKV.get(listKey, { type: 'json' }) || [];
      const queueLength = queueList.length;
      
      queueWeights[clinic] = queueLength;
      
      // Calculate score for this clinic
      const priorityWeight = priorityWeights[clinic] || 1.0;
      const avgServiceTime = getAvgServiceTime(clinic);
      const score = calculateClinicScore(queueLength, priorityWeight, avgServiceTime);
      
      queueScores[clinic] = {
        queue_length: queueLength,
        priority_weight: priorityWeight,
        avg_service_time: avgServiceTime,
        calculated_score: score
      };
    }
    
    // Sort clinics by score (ascending - lower is better)
    const sortedClinics = [...requiredClinics].sort((a, b) => {
      const scoreA = queueScores[a].calculated_score;
      const scoreB = queueScores[b].calculated_score;
      return scoreA - scoreB;
    });
    
    // Apply mandatory ordering rules
    let finalPath = [];
    
    // Rule 1: Lab and X-ray must be first (if included)
    if (sortedClinics.includes('lab')) {
      finalPath.push('lab');
      sortedClinics.splice(sortedClinics.indexOf('lab'), 1);
    }
    
    if (sortedClinics.includes('xray')) {
      finalPath.push('xray');
      sortedClinics.splice(sortedClinics.indexOf('xray'), 1);
    }
    
    // Rule 2: Add remaining clinics in optimal order
    finalPath = finalPath.concat(sortedClinics);
    
    // Generate session code
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substr(2, 4);
    const sessionCode = `${exam_type.substring(0, 3).toUpperCase()}-${user_id.substring(0, 4)}-${timestamp}-${random}`;
    
    // Create clinic names array
    const clinicNames = finalPath.map(clinic => CLINIC_NAMES[clinic] || clinic);
    
    // Calculate total estimated time
    let totalEstimatedTime = 0;
    for (const clinic of finalPath) {
      const queueLength = queueWeights[clinic];
      const avgTime = getAvgServiceTime(clinic);
      totalEstimatedTime += (queueLength + 1) * avgTime; // +1 for current patient
    }
    
    // Save path (Sticky)
    const pathData = {
      session_code: sessionCode,
      user_id,
      exam_type,
      exam_name: examConfig.name,
      clinic_path: finalPath,
      clinic_names: clinicNames,
      weights: queueWeights,
      scores: queueScores,
      total_estimated_time_minutes: totalEstimatedTime,
      no_pin: examConfig.no_pin || false,
      created_at: new Date().toISOString(),
      sticky: true,
      algorithm_version: '2.0-dynamic-weighted'
    };
    
    await kv.put(pathKey, JSON.stringify(pathData), {
      expirationTtl: 86400 // 24 hours
    });
    
    // Log path assignment for analytics
    const logKey = `path:log:${new Date().toISOString().split('T')[0]}`;
    const dailyLog = await kv.get(logKey, { type: 'json' }) || [];
    dailyLog.push({
      session_code: sessionCode,
      user_id,
      exam_type,
      timestamp: pathData.created_at,
      total_clinics: finalPath.length,
      estimated_time: totalEstimatedTime
    });
    
    await kv.put(logKey, JSON.stringify(dailyLog), {
      expirationTtl: 604800 // 7 days
    });
    
    return jsonResponse({
      success: true,
      sticky: true,
      user_id,
      exam_type,
      exam_name: examConfig.name,
      session_code: sessionCode,
      clinic_path: finalPath,
      clinic_names: clinicNames,
      weights_used: queueWeights,
      scores_calculated: queueScores,
      total_estimated_time_minutes: totalEstimatedTime,
      total_estimated_time_text: formatTime(totalEstimatedTime),
      no_pin: pathData.no_pin,
      created_at: pathData.created_at,
      algorithm: 'Dynamic Weighted Routing v2.0',
      message: 'تم حساب المسار الأمثل بنجاح'
    });
    
  } catch (error) {
    console.error('Dynamic path assignment error:', error);
    return jsonResponse({
      success: false,
      error: error.message
    }, 500);
  }
}

// Helper function to format time
function formatTime(minutes) {
  if (minutes < 1) return 'أقل من دقيقة';
  if (minutes === 1) return 'دقيقة واحدة';
  if (minutes === 2) return 'دقيقتان';
  if (minutes <= 10) return `${minutes} دقائق`;
  if (minutes <= 60) return `حوالي ${Math.round(minutes / 5) * 5} دقيقة`;
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  if (remainingMinutes === 0) return `${hours} ساعة`;
  return `${hours} ساعة و ${remainingMinutes} دقيقة`;
}


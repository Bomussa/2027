// Path Analytics - View routing statistics and weight distribution
// GET /api/v1/path/analytics?date=2025-10-20

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
  
  const date = url.searchParams.get('date') || new Date().toISOString().split('T')[0];
  
  try {
    const kv = env.KV_ADMIN;
    
    // Get daily path log
    const logKey = `path:log:${date}`;
    const dailyLog = await kv.get(logKey, { type: 'json' }) || [];
    
    // Calculate statistics
    const stats = {
      total_paths_assigned: dailyLog.length,
      by_exam_type: {},
      avg_estimated_time: 0,
      total_clinics_visited: 0,
      unique_users: new Set()
    };
    
    let totalTime = 0;
    let totalClinics = 0;
    
    for (const entry of dailyLog) {
      // Count by exam type
      if (!stats.by_exam_type[entry.exam_type]) {
        stats.by_exam_type[entry.exam_type] = 0;
      }
      stats.by_exam_type[entry.exam_type]++;
      
      // Accumulate totals
      totalTime += entry.estimated_time || 0;
      totalClinics += entry.total_clinics || 0;
      
      // Track unique users
      stats.unique_users.add(entry.user_id);
    }
    
    // Calculate averages
    if (dailyLog.length > 0) {
      stats.avg_estimated_time = Math.round(totalTime / dailyLog.length);
      stats.avg_clinics_per_path = Math.round(totalClinics / dailyLog.length * 10) / 10;
    }
    
    stats.unique_users_count = stats.unique_users.size;
    delete stats.unique_users; // Remove Set object
    
    // Get current queue weights for all clinics
    const queueKV = env.KV_QUEUES;
    const clinics = ['lab', 'xray', 'eyes', 'internal', 'ent', 'derma', 'ortho', 'dental'];
    const currentWeights = {};
    
    for (const clinic of clinics) {
      const listKey = `queue:list:${clinic}`;
      const queueList = await queueKV.get(listKey, { type: 'json' }) || [];
      currentWeights[clinic] = queueList.length;
    }
    
    return jsonResponse({
      success: true,
      date,
      statistics: stats,
      current_queue_weights: currentWeights,
      recent_assignments: dailyLog.slice(-10).reverse(), // Last 10 assignments
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Path analytics error:', error);
    return jsonResponse({
      success: false,
      error: error.message
    }, 500);
  }
}


// Dashboard Stats - Get comprehensive statistics for admin dashboard
// Returns real-time stats from all queues

export async function onRequestGet(context) {
  const { env } = context;
  
  try {
    const kv = env.MMC_KV;
    
    // List of all clinics
    const clinics = [
      'lab', 'xray', 'eyes', 'internal', 'ent', 'surgery',
      'dental', 'psychiatry', 'derma', 'bones', 'vitals',
      'ecg', 'audio', 'women_internal', 'women_derma', 'women_eyes'
    ];
    
    let totalWaiting = 0;
    let activeQueues = 0;
    let completedToday = 0;
    let totalWaitTime = 0;
    let waitTimeCount = 0;
    
    // Get stats for each clinic
    const dateKey = new Date().toISOString().split('T')[0];
    
    for (const clinic of clinics) {
      const queueKey = `queue:${clinic}:${dateKey}`;
      const queueData = await kv.get(queueKey, { type: 'json' });
      
      if (!queueData) continue;
      
      // Count waiting patients
      if (queueData.waiting && queueData.waiting.length > 0) {
        totalWaiting += queueData.waiting.length;
        activeQueues++;
      }
      
      // Count completed
      if (queueData.done && Array.isArray(queueData.done)) {
        completedToday += queueData.done.length;
        
        // Calculate wait times
        for (const entry of queueData.done) {
          if (entry.issuedAt && entry.calledAt) {
            const waitTime = new Date(entry.calledAt) - new Date(entry.issuedAt);
            totalWaitTime += waitTime;
            waitTimeCount++;
          }
        }
      }
    }
    
    // Calculate average wait time in minutes
    const avgWaitTime = waitTimeCount > 0 
      ? Math.round(totalWaitTime / waitTimeCount / 1000 / 60) 
      : 0;
    
    return new Response(JSON.stringify({
      success: true,
      stats: {
        totalWaiting: totalWaiting,
        activeQueues: activeQueues,
        completedToday: completedToday,
        avgWaitTime: avgWaitTime
      },
      timestamp: new Date().toISOString()
    }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Cache-Control': 'no-cache, no-store, must-revalidate'
      }
    });
    
  } catch (error) {
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json; charset=utf-8' }
    });
  }
}


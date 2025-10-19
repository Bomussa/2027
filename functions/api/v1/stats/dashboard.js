// Dashboard Stats - Get comprehensive statistics for admin dashboard
// Returns real-time stats from all queues

export async function onRequestGet(context) {
  const { env } = context;
  
  try {
    const kv = env.KV_QUEUES;
    
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
    for (const clinic of clinics) {
      const listKey = `queue:list:${clinic}`;
      const statusKey = `queue:status:${clinic}`;
      
      const queueList = await kv.get(listKey, { type: 'json' }) || [];
      const status = await kv.get(statusKey, { type: 'json' }) || { current: null, served: [] };
      
      // Count waiting patients
      if (queueList.length > 0) {
        totalWaiting += queueList.length;
        activeQueues++;
      }
      
      // Count completed
      if (status.served && Array.isArray(status.served)) {
        completedToday += status.served.length;
      }
      
      // Calculate wait times
      if (status.served && Array.isArray(status.served)) {
        for (const served of status.served) {
          if (served.entered_at && served.called_at) {
            const waitTime = new Date(served.called_at) - new Date(served.entered_at);
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


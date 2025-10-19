// All Queues Stats - Get status of all queues
// Returns list of all queues with their current status

export async function onRequestGet(context) {
  const { env } = context;
  
  try {
    const kv = env.KV_QUEUES;
    
    // List of all clinics with names
    const clinics = [
      { id: 'lab', name: 'المختبر' },
      { id: 'xray', name: 'الأشعة' },
      { id: 'eyes', name: 'العيون' },
      { id: 'internal', name: 'الباطنية' },
      { id: 'ent', name: 'الأنف والأذن والحنجرة' },
      { id: 'surgery', name: 'الجراحة' },
      { id: 'dental', name: 'الأسنان' },
      { id: 'psychiatry', name: 'الطب النفسي' },
      { id: 'derma', name: 'الجلدية' },
      { id: 'bones', name: 'العظام' },
      { id: 'vitals', name: 'القياسات الحيوية' },
      { id: 'ecg', name: 'تخطيط القلب' },
      { id: 'audio', name: 'السمعيات' },
      { id: 'women_internal', name: 'الباطنية (نساء)' },
      { id: 'women_derma', name: 'الجلدية (نساء)' },
      { id: 'women_eyes', name: 'العيون (نساء)' }
    ];
    
    const queues = [];
    
    // Get stats for each clinic
    for (const clinic of clinics) {
      const listKey = `queue:list:${clinic.id}`;
      const statusKey = `queue:status:${clinic.id}`;
      
      const queueList = await kv.get(listKey, { type: 'json' }) || [];
      const statusData = await kv.get(statusKey, { type: 'json' });
      const status = statusData || { current: null, served: [] };
      
      // Ensure served array exists
      if (!status.served) {
        status.served = [];
      }
      
      // Calculate waiting
      let waiting = 0;
      if (status.current) {
        waiting = queueList.filter(item => item.number > status.current).length;
      } else {
        waiting = queueList.length;
      }
      
      queues.push({
        clinic: clinic.id,
        name: clinic.name,
        current: status.current,
        current_display: status.served.length + 1,
        total: queueList.length,
        waiting: waiting,
        completed: status.served.length,
        active: queueList.length > 0
      });
    }
    
    return new Response(JSON.stringify({
      success: true,
      queues: queues,
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


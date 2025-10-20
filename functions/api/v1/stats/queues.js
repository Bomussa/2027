// All Queues Stats - Get status of all queues
// Returns list of all queues with their current status

export async function onRequestGet(context) {
  const { env } = context;
  
  try {
    const kv = env.MMC_KV;
    const dateKey = new Date().toISOString().split('T')[0];
    
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
      const queueKey = `queue:${clinic.id}:${dateKey}`;
      const queueData = await kv.get(queueKey, { type: 'json' });
      
      if (!queueData) {
        // No data for this clinic today
        queues.push({
          clinic: clinic.id,
          name: clinic.name,
          current: null,
          current_display: 0,
          total: 0,
          waiting: 0,
          completed: 0,
          active: false
        });
        continue;
      }
      
      const waiting = queueData.waiting ? queueData.waiting.length : 0;
      const inService = queueData.in ? queueData.in.length : 0;
      const completed = queueData.done ? queueData.done.length : 0;
      const total = waiting + inService + completed;
      
      queues.push({
        clinic: clinic.id,
        name: clinic.name,
        current: queueData.current || null,
        current_display: completed + 1,
        total: total,
        waiting: waiting,
        completed: completed,
        active: total > 0
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


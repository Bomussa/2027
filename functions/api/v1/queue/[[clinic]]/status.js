/**
 * Queue Status Endpoint (Enhanced with Call & Done actions)
 * GET /api/v1/queue/:clinic/status - Get queue status
 * GET /api/v1/queue/:clinic/status?action=call - Call next in queue
 * GET /api/v1/queue/:clinic/status?action=done&pin=XX - Mark as done
 */

export async function onRequestGet(context) {
  const { request, env, params } = context;
  
  try {
    const clinic = params.clinic?.[0];
    
    if (!clinic) {
      return jsonResponse({ error: 'Clinic name required' }, 400);
    }

    const url = new URL(request.url);
    const action = url.searchParams.get('action');
    const pin = url.searchParams.get('pin');

    const now = new Date();
    const qatarTime = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Qatar' }));
    const dateKey = qatarTime.toISOString().split('T')[0];

    const queueKey = `queue:${clinic}:${dateKey}`;
    let queueData = await env.KV_QUEUES.get(queueKey, { type: 'json' });

    // Handle actions
    if (action === 'call') {
      return await handleCall(env, clinic, dateKey, queueKey, queueData);
    } else if (action === 'done') {
      if (!pin) {
        return jsonResponse({ error: 'PIN required for done action' }, 400);
      }
      return await handleDone(env, clinic, dateKey, queueKey, queueData, pin);
    }

    // Default: Return status
    if (!queueData) {
      return jsonResponse({
        clinic: clinic,
        date: dateKey,
        initialized: false,
        current_pin: null,
        next_pin: null,
        queue_length: 0,
        in_service: 0,
        capacity: 1,
        avg_wait_minutes: 0,
        queue: []
      }, 200);
    }

    // Support both 'queue' and 'entries' fields
    const entries = queueData.entries || queueData.queue || [];

    // Calculate waiting queue
    const waitingQueue = entries.filter(
      item => item.status === 'WAITING' || item.status === 'NEAR_TURN'
    );

    return jsonResponse({
      clinic: clinic,
      date: dateKey,
      initialized: true,
      current_pin: queueData.current_pin,
      next_pin: queueData.next_pin,
      queue_length: waitingQueue.length,
      in_service: queueData.in_service || 0,
      capacity: queueData.capacity || 1,
      avg_wait_minutes: Math.ceil((queueData.avg_wait_seconds || 0) / 60),
      queue: entries.map(item => ({
        pin: item.pin,
        status: item.status,
        entered_at: item.entered_at,
        waiting_minutes: item.entered_at 
          ? Math.ceil((Date.now() - new Date(item.entered_at).getTime()) / 60000)
          : 0
      }))
    }, 200);

  } catch (error) {
    return jsonResponse({ error: error.message }, 500);
  }
}

async function handleCall(env, clinic, dateKey, queueKey, queueData) {
  if (!queueData) {
    return jsonResponse({ error: 'No queue found' }, 404);
  }

  const entries = queueData.entries || queueData.queue || [];
  
  // Find next WAITING entry
  const nextEntry = entries.find(e => e.status === 'WAITING');
  
  if (!nextEntry) {
    return jsonResponse({
      success: false,
      message: 'No one in queue',
      clinic: clinic,
      date: dateKey
    }, 200);
  }

  // Update status to IN_SERVICE
  nextEntry.status = 'IN_SERVICE';
  nextEntry.called_at = new Date().toISOString();
  
  // Update queue data
  queueData.current_pin = nextEntry.pin;
  queueData.queue_length = entries.filter(e => e.status === 'WAITING').length;
  queueData.last_updated = new Date().toISOString();

  // Save
  await env.KV_QUEUES.put(queueKey, JSON.stringify(queueData));

  // Log event
  await logEvent(env.KV_EVENTS, {
    type: 'QUEUE_CALL',
    clinic: clinic,
    pin: nextEntry.pin,
    date: dateKey,
    timestamp: new Date().toISOString()
  });

  return jsonResponse({
    success: true,
    action: 'call',
    clinic: clinic,
    called_pin: nextEntry.pin,
    session_code: nextEntry.session_code,
    queue_length: queueData.queue_length,
    timestamp: new Date().toISOString()
  }, 200);
}

async function handleDone(env, clinic, dateKey, queueKey, queueData, pin) {
  if (!queueData) {
    return jsonResponse({ error: 'No queue found' }, 404);
  }

  const entries = queueData.entries || queueData.queue || [];
  
  // Find entry
  const entry = entries.find(e => e.pin === pin);
  
  if (!entry) {
    return jsonResponse({ error: 'PIN not found in queue' }, 404);
  }

  if (entry.status !== 'IN_SERVICE') {
    return jsonResponse({ 
      error: 'PIN not in service',
      current_status: entry.status 
    }, 400);
  }

  // Update status to DONE
  entry.status = 'DONE';
  entry.served_at = new Date().toISOString();
  
  // Calculate wait time
  if (entry.entered_at) {
    entry.wait_seconds = Math.floor(
      (new Date(entry.served_at).getTime() - new Date(entry.entered_at).getTime()) / 1000
    );
  }

  // Update queue data
  queueData.current_pin = null;
  queueData.total_served = (queueData.total_served || 0) + 1;
  queueData.queue_length = entries.filter(e => e.status === 'WAITING').length;
  queueData.last_updated = new Date().toISOString();

  // Update average wait time
  const completedEntries = entries.filter(e => e.status === 'DONE' && e.wait_seconds);
  if (completedEntries.length > 0) {
    const totalWait = completedEntries.reduce((sum, e) => sum + e.wait_seconds, 0);
    queueData.avg_wait_seconds = Math.floor(totalWait / completedEntries.length);
  }

  // Save
  await env.KV_QUEUES.put(queueKey, JSON.stringify(queueData));

  // Log event
  await logEvent(env.KV_EVENTS, {
    type: 'QUEUE_DONE',
    clinic: clinic,
    pin: pin,
    wait_seconds: entry.wait_seconds,
    date: dateKey,
    timestamp: new Date().toISOString()
  });

  return jsonResponse({
    success: true,
    action: 'done',
    clinic: clinic,
    pin: pin,
    wait_seconds: entry.wait_seconds,
    total_served: queueData.total_served,
    queue_length: queueData.queue_length,
    timestamp: new Date().toISOString()
  }, 200);
}

async function logEvent(kvEvents, event) {
  try {
    const eventId = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const eventKey = `event:${event.type}:${eventId}`;
    
    await kvEvents.put(eventKey, JSON.stringify(event), {
      expirationTtl: 30 * 24 * 60 * 60 // 30 days
    });
  } catch (error) {
    console.error('Failed to log event:', error);
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


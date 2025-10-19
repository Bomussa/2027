/**
 * Queue Done Endpoint
 * POST /api/v1/queue/:clinic/done
 * Marks current service as done and calculates wait time
 */

export async function onRequestPost(context) {
  const { request, env, params } = context;
  
  try {
    const clinic = params.clinic?.[0];
    
    if (!clinic) {
      return jsonResponse({ error: 'Clinic name required' }, 400);
    }

    const body = await request.json().catch(() => ({}));
    const pin = body.pin;

    if (!pin) {
      return jsonResponse({ error: 'PIN required' }, 400);
    }

    const now = new Date();
    const qatarTime = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Qatar' }));
    const dateKey = qatarTime.toISOString().split('T')[0];

    // Get queue data
    const queueKey = `queue:${clinic}:${dateKey}`;
    let queueData = await env.KV_QUEUES.get(queueKey, { type: 'json' });

    if (!queueData || !queueData.queue) {
      return jsonResponse({
        error: 'Queue not found',
        message: 'الطابور غير موجود'
      }, 404);
    }

    // Find the patient with this PIN
    const patientIndex = queueData.queue.findIndex(item => item.pin === pin);
    
    if (patientIndex === -1) {
      return jsonResponse({
        error: 'Patient not found in queue',
        message: 'المراجع غير موجود في الطابور'
      }, 404);
    }

    const patient = queueData.queue[patientIndex];

    // Check if patient is IN_SERVICE
    if (patient.status !== 'IN_SERVICE') {
      return jsonResponse({
        error: 'Patient is not in service',
        message: 'المراجع ليس في حالة الخدمة',
        current_status: patient.status
      }, 400);
    }

    // Update to DONE
    patient.status = 'DONE';
    patient.done_at = new Date().toISOString();

    // Calculate wait time and service time
    const enteredAt = new Date(patient.entered_at);
    const calledAt = new Date(patient.called_at);
    const doneAt = new Date(patient.done_at);

    const waitTimeSeconds = Math.floor((calledAt - enteredAt) / 1000);
    const serviceTimeSeconds = Math.floor((doneAt - calledAt) / 1000);

    patient.wait_time_seconds = waitTimeSeconds;
    patient.service_time_seconds = serviceTimeSeconds;

    // Update average wait time
    const completedPatients = queueData.queue.filter(item => item.status === 'DONE');
    const totalWaitTime = completedPatients.reduce((sum, p) => sum + (p.wait_time_seconds || 0), 0);
    queueData.avg_wait_seconds = completedPatients.length > 0 
      ? Math.floor(totalWaitTime / completedPatients.length) 
      : 0;

    // Decrease in_service count
    if (queueData.in_service > 0) {
      queueData.in_service -= 1;
    }

    // Clear current_pin if it was this patient
    if (queueData.current_pin === pin) {
      queueData.current_pin = null;
    }

    // Save queue data
    await env.KV_QUEUES.put(queueKey, JSON.stringify(queueData));

    // Log STEP_DONE_NEXT event
    await logEvent(env.KV_EVENTS, {
      type: 'STEP_DONE_NEXT',
      clinic: clinic,
      pin: pin,
      date: dateKey,
      wait_time_seconds: waitTimeSeconds,
      service_time_seconds: serviceTimeSeconds,
      timestamp: new Date().toISOString()
    });

    return jsonResponse({
      success: true,
      clinic: clinic,
      pin: pin,
      status: 'DONE',
      wait_time_minutes: Math.ceil(waitTimeSeconds / 60),
      service_time_minutes: Math.ceil(serviceTimeSeconds / 60),
      avg_wait_minutes: Math.ceil(queueData.avg_wait_seconds / 60),
      timestamp: new Date().toISOString()
    }, 200);

  } catch (error) {
    return jsonResponse({ error: error.message }, 500);
  }
}

async function logEvent(kvEvents, event) {
  try {
    const eventKey = `event:${event.clinic}:${event.pin}:${Date.now()}`;
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


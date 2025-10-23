// Patient Verify PIN - Complete clinic and move to next
// POST /api/v1/patient/verify-pin
// Body: { patientId, clinic, pin, queueNumber }

import { jsonResponse, corsResponse, validateRequiredFields, checkKVAvailability } from '../../../_shared/utils.js';

export async function onRequest(context) {
  const { request, env } = context;
  
  if (request.method !== 'POST') {
    return jsonResponse({ success: false, error: 'Method not allowed' }, 405);
  }
  
  try {
    const body = await request.json();
    const { patientId, clinic, pin, queueNumber } = body;
    
    // Validate required fields
    const validationError = validateRequiredFields(body, ['patientId', 'clinic', 'pin', 'queueNumber']);
    if (validationError) {
      return jsonResponse(validationError, 400);
    }
    
    // Check all KV availability
    const kvQueuesError = checkKVAvailability(env.KV_QUEUES, 'KV_QUEUES');
    if (kvQueuesError) return jsonResponse(kvQueuesError, 500);
    
    const kvPinsError = checkKVAvailability(env.KV_PINS, 'KV_PINS');
    if (kvPinsError) return jsonResponse(kvPinsError, 500);
    
    const kvAdminError = checkKVAvailability(env.KV_ADMIN, 'KV_ADMIN');
    if (kvAdminError) return jsonResponse(kvAdminError, 500);
    
    const kvEventsError = checkKVAvailability(env.KV_EVENTS, 'KV_EVENTS');
    if (kvEventsError) return jsonResponse(kvEventsError, 500);
    
    // ============================================================
    // STEP 1: Verify PIN
    // ============================================================
    const today = new Date().toISOString().split('T')[0];
    const pinsKey = `pins:daily:${today}`;
    const dailyPins = await env.KV_PINS.get(pinsKey, 'json');
    
    if (!dailyPins) {
      return jsonResponse({ 
        success: false, 
        error: 'لم يتم العثور على أرقام PIN اليومية',
        message: 'Daily PINs not found'
      }, 404);
    }
    
    const clinicPinData = dailyPins[clinic];
    if (!clinicPinData) {
      return jsonResponse({ 
        success: false, 
        error: 'لم يتم العثور على PIN لهذه العيادة',
        message: 'PIN not found for this clinic'
      }, 404);
    }
    
    const correctPin = typeof clinicPinData === 'object' ? clinicPinData.pin : clinicPinData;
    const normalizedInputPin = String(pin).trim();
    const normalizedCorrectPin = String(correctPin).trim();
    
    if (normalizedInputPin !== normalizedCorrectPin) {
      return jsonResponse({ 
        success: false, 
        error: 'رقم PIN غير صحيح',
        message: 'Incorrect PIN'
      }, 403);
    }
    
    // Verify PIN doesn't belong to another clinic
    for (const [otherClinic, otherPinData] of Object.entries(dailyPins)) {
      if (otherClinic !== clinic) {
        const otherPin = typeof otherPinData === 'object' ? otherPinData.pin : otherPinData;
        if (String(otherPin).trim() === normalizedInputPin) {
          return jsonResponse({ 
            success: false, 
            error: `رقم PIN هذا يخص عيادة ${otherClinic} وليس ${clinic}`,
            message: `This PIN belongs to ${otherClinic}, not ${clinic}`
          }, 403);
        }
      }
    }
    
    // ============================================================
    // STEP 2: Verify queue number
    // ============================================================
    const userKey = `queue:user:${clinic}:${patientId}`;
    const userEntry = await env.KV_QUEUES.get(userKey, 'json');
    
    if (!userEntry) {
      return jsonResponse({ 
        success: false, 
        error: 'لم يتم العثور على المراجع في الطابور',
        message: 'Patient not found in queue'
      }, 404);
    }
    
    if (userEntry.number !== parseInt(queueNumber)) {
      return jsonResponse({ 
        success: false, 
        error: 'رقم الطابور غير صحيح',
        message: 'Incorrect queue number',
        expected: userEntry.number,
        provided: parseInt(queueNumber)
      }, 403);
    }
    
    // ============================================================
    // STEP 3: Mark clinic as DONE
    // ============================================================
    const now = new Date();
    const exitTime = now.toISOString();
    const entryTime = new Date(userEntry.entry_time || userEntry.entered_at);
    const durationMs = now - entryTime;
    const durationMinutes = Math.round(durationMs / 60000);
    
    userEntry.status = 'DONE';
    userEntry.exit_time = exitTime;
    userEntry.duration_minutes = durationMinutes;
    userEntry.pin_verified = true;
    userEntry.pin_verified_at = exitTime;
    
    await env.KV_QUEUES.put(userKey, JSON.stringify(userEntry), {
      expirationTtl: 86400
    });
    
    // Remove from queue list
    const listKey = `queue:list:${clinic}`;
    let queueList = await env.KV_QUEUES.get(listKey, 'json') || [];
    queueList = queueList.filter(item => item.user !== patientId);
    await env.KV_QUEUES.put(listKey, JSON.stringify(queueList), {
      expirationTtl: 86400
    });
    
    // ============================================================
    // STEP 4: Update statistics
    // ============================================================
    const statsKey = `stats:clinic:${clinic}:${today}`;
    let stats = await env.KV_ADMIN.get(statsKey, 'json') || {
      clinic: clinic,
      date: today,
      total_entered: 0,
      total_completed: 0,
      total_duration_minutes: 0,
      avg_duration_minutes: 0
    };
    
    stats.total_completed += 1;
    stats.total_duration_minutes += durationMinutes;
    stats.avg_duration_minutes = Math.round(stats.total_duration_minutes / stats.total_completed);
    stats.last_updated = exitTime;
    
    await env.KV_ADMIN.put(statsKey, JSON.stringify(stats), {
      expirationTtl: 86400 * 7 // Keep for 7 days
    });
    
    // ============================================================
    // STEP 5: Get patient path and find next clinic
    // ============================================================
    const pathKey = `path:${patientId}`;
    let patientPath = await env.KV_ADMIN.get(pathKey, 'json');
    
    if (!patientPath || !patientPath.route) {
      return jsonResponse({ 
        success: false, 
        error: 'لم يتم العثور على مسار المراجع',
        message: 'Patient path not found'
      }, 404);
    }
    
    // Find current clinic index in route
    const currentIndex = patientPath.route.indexOf(clinic);
    if (currentIndex === -1) {
      return jsonResponse({ 
        success: false, 
        error: 'العيادة الحالية غير موجودة في المسار',
        message: 'Current clinic not in route'
      }, 400);
    }
    
    // Check if there's a next clinic
    const hasNextClinic = currentIndex < patientPath.route.length - 1;
    
    if (!hasNextClinic) {
      // Last clinic - mark journey as complete
      patientPath.status = 'COMPLETED';
      patientPath.completed_at = exitTime;
      await env.KV_ADMIN.put(pathKey, JSON.stringify(patientPath), {
        expirationTtl: 86400
      });
      
      // Log completion event
      const completionEvent = {
        type: 'JOURNEY_COMPLETED',
        patientId: patientId,
        completed_at: exitTime,
        total_clinics: patientPath.route.length,
        route: patientPath.route
      };
      
      await env.KV_EVENTS.put(
        `event:completion:${patientId}:${Date.now()}`,
        JSON.stringify(completionEvent),
        { expirationTtl: 86400 }
      );
      
      return jsonResponse({
        success: true,
        clinic_completed: clinic,
        pin_verified: true,
        journey_completed: true,
        message: 'تم إنهاء جميع الفحوصات بنجاح',
        total_clinics_completed: patientPath.route.length,
        duration_minutes: durationMinutes
      });
    }
    
    // ============================================================
    // STEP 6: Get next clinic and enter queue automatically
    // ============================================================
    const nextClinic = patientPath.route[currentIndex + 1];
    
    // Enter next clinic queue automatically
    const nextListKey = `queue:list:${nextClinic}`;
    let nextQueueList = await env.KV_QUEUES.get(nextListKey, 'json') || [];
    
    // Check if already in next queue
    const alreadyInNext = nextQueueList.find(item => item.user === patientId);
    let nextQueueNumber;
    
    if (alreadyInNext) {
      nextQueueNumber = alreadyInNext.number;
    } else {
      // Assign new queue number
      nextQueueNumber = nextQueueList.length + 1;
      
      const nextQueueEntry = {
        number: nextQueueNumber,
        user: patientId,
        entered_at: exitTime,
        status: 'WAITING',
        auto_entered: true,
        previous_clinic: clinic
      };
      
      nextQueueList.push(nextQueueEntry);
      
      await env.KV_QUEUES.put(nextListKey, JSON.stringify(nextQueueList), {
        expirationTtl: 86400
      });
      
      // Save user entry for next clinic
      const nextUserKey = `queue:user:${nextClinic}:${patientId}`;
      const nextUserEntry = {
        number: nextQueueNumber,
        status: 'WAITING',
        entered_at: exitTime,
        entry_time: exitTime,
        user: patientId,
        clinic: nextClinic,
        auto_entered: true
      };
      
      await env.KV_QUEUES.put(nextUserKey, JSON.stringify(nextUserEntry), {
        expirationTtl: 86400
      });
      
      // Update stats for next clinic
      const nextStatsKey = `stats:clinic:${nextClinic}:${today}`;
      let nextStats = await env.KV_ADMIN.get(nextStatsKey, 'json') || {
        clinic: nextClinic,
        date: today,
        total_entered: 0,
        total_completed: 0,
        total_duration_minutes: 0,
        avg_duration_minutes: 0
      };
      
      nextStats.total_entered += 1;
      nextStats.last_updated = exitTime;
      
      await env.KV_ADMIN.put(nextStatsKey, JSON.stringify(nextStats), {
        expirationTtl: 86400 * 7
      });
    }
    
    // ============================================================
    // STEP 7: Update patient path progress
    // ============================================================
    if (!patientPath.progress) {
      patientPath.progress = [];
    }
    
    patientPath.progress.push({
      clinic: clinic,
      completed_at: exitTime,
      duration_minutes: durationMinutes,
      queue_number: queueNumber,
      pin_verified: true
    });
    
    patientPath.current_clinic = nextClinic;
    patientPath.current_index = currentIndex + 1;
    patientPath.last_updated = exitTime;
    
    await env.KV_ADMIN.put(pathKey, JSON.stringify(patientPath), {
      expirationTtl: 86400
    });
    
    // ============================================================
    // STEP 8: Create notification event
    // ============================================================
    const notificationEvent = {
      type: 'CLINIC_COMPLETED_NEXT',
      patientId: patientId,
      completed_clinic: clinic,
      next_clinic: nextClinic,
      next_queue_number: nextQueueNumber,
      timestamp: exitTime,
      message: `تم إنهاء ${clinic}. توجه إلى ${nextClinic} - رقمك: ${nextQueueNumber}`
    };
    
    await env.KV_EVENTS.put(
      `event:notification:${patientId}:${Date.now()}`,
      JSON.stringify(notificationEvent),
      { expirationTtl: 3600 } // 1 hour
    );
    
    // ============================================================
    // STEP 9: Return complete response
    // ============================================================
    const remainingClinics = patientPath.route.length - (currentIndex + 1) - 1;
    
    return jsonResponse({
      success: true,
      pin_verified: true,
      clinic_completed: clinic,
      duration_minutes: durationMinutes,
      next_clinic: nextClinic,
      next_queue_number: nextQueueNumber,
      ahead_in_next: nextQueueNumber - 1,
      remaining_clinics: remainingClinics,
      total_progress: `${currentIndex + 1}/${patientPath.route.length}`,
      notification: {
        title: 'انتقل إلى العيادة التالية',
        message: `توجه إلى ${nextClinic}`,
        queue_number: nextQueueNumber,
        clinic: nextClinic
      },
      stats_updated: true,
      auto_entered_next: true
    });
    
  } catch (error) {
    return jsonResponse({ 
      success: false, 
      error: error.message,
      timestamp: new Date().toISOString()
    }, 500);
  }
}

// Handle OPTIONS for CORS
export async function onRequestOptions() {
  return corsResponse(['POST', 'OPTIONS']);
}


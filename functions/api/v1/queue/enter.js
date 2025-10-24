// Queue Enter V2 - Counter-based system
// POST /api/v1/queue/enter
// Sequential numbers that never decrease
// Database counts: entered, exited
// Display: entered - exited = waiting

import { jsonResponse, corsResponse, validateRequiredFields, checkKVAvailability } from '../../../_shared/utils.js';
import { logActivity } from '../../../_shared/activity-logger.js';
import { validateQueueEnter } from '../../../_shared/db-validator.js';

export async function onRequest(context) {
  const { request, env } = context;
  
  if (request.method !== 'POST') {
    return jsonResponse({ success: false, error: 'Method not allowed' }, 405);
  }
  
  try {
    const body = await request.json();
    const { clinic, user } = body;
    
    const validationError = validateRequiredFields(body, ['clinic', 'user']);
    if (validationError) {
      return jsonResponse(validationError, 400);
    }
    
    const kvError = checkKVAvailability(env.KV_QUEUES, 'KV_QUEUES');
    if (kvError) {
      return jsonResponse(kvError, 500);
    }
    
    // Validate patient can enter this clinic
    const validation = await validateQueueEnter(env, user, clinic);
    if (!validation.valid) {
      return jsonResponse({
        success: false,
        error: validation.error,
        code: validation.code,
        details: validation
      }, validation.code === 'PATIENT_NOT_FOUND' ? 404 : 403);
    }
    
    const now = new Date();
    const entryTime = now.toISOString();
    
    // ============================================================
    // COUNTER-BASED SYSTEM
    // ============================================================
    
    // Get clinic counters
    const counterKey = `counter:${clinic}`;
    let counters = await env.KV_QUEUES.get(counterKey, 'json') || {
      clinic: clinic,
      entered: 0,
      exited: 0,
      reset_at: entryTime
    };
    
    // Check if patient already entered
    const userKey = `queue:user:${clinic}:${user}`;
    const existingEntry = await env.KV_QUEUES.get(userKey, 'json');
    
    if (existingEntry && existingEntry.status !== 'DONE') {
      // Already in queue
      const waiting = counters.entered - counters.exited;
      
      return jsonResponse({
        success: true,
        clinic: clinic,
        user: user,
        number: existingEntry.number,
        status: existingEntry.status,
        entry_time: existingEntry.entered_at,
        waiting_count: waiting,
        message: 'Already in queue'
      });
    }
    
    // Increment entered counter
    counters.entered += 1;
    const assignedNumber = counters.entered;
    
    // Save counters
    await env.KV_QUEUES.put(counterKey, JSON.stringify(counters), {
      expirationTtl: 86400
    });
    
    // Save user entry
    const userEntry = {
      number: assignedNumber,
      status: 'WAITING',
      entered_at: entryTime,
      clinic: clinic,
      user: user
    };
    
    await env.KV_QUEUES.put(userKey, JSON.stringify(userEntry), {
      expirationTtl: 86400
    });
    
    // Calculate waiting count
    const waiting = counters.entered - counters.exited;
    
    // Log activity
    await logActivity(env, 'ENTER', {
      patientId: user,
      clinic: clinic,
      queueNumber: assignedNumber,
      details: {
        entered_count: counters.entered,
        exited_count: counters.exited,
        waiting_count: waiting
      }
    });
    
    return jsonResponse({
      success: true,
      clinic: clinic,
      user: user,
      number: assignedNumber,
      status: 'WAITING',
      entry_time: entryTime,
      counters: {
        entered: counters.entered,
        exited: counters.exited,
        waiting: waiting
      }
    });
    
  } catch (error) {
    return jsonResponse({ 
      success: false, 
      error: error.message,
      timestamp: new Date().toISOString()
    }, 500);
  }
}

export async function onRequestOptions() {
  return corsResponse(['POST', 'OPTIONS']);
}


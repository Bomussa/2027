// Patient My Position - Get dynamic position in queue
// GET /api/v1/patient/my-position?patientId=12345678&clinic=lab

import { jsonResponse } from '../../../_shared/utils.js';

export async function onRequest(context) {
  const { request, env } = context;
  
  if (request.method !== 'GET') {
    return jsonResponse({ success: false, error: 'Method not allowed' }, 405);
  }
  
  try {
    const url = new URL(request.url);
    const patientId = url.searchParams.get('patientId');
    const clinic = url.searchParams.get('clinic');
    
    if (!patientId || !clinic) {
      return jsonResponse({
        success: false,
        error: 'patientId and clinic are required'
      }, 400);
    }
    
    // Get queue list for this clinic
    const listKey = `queue:list:${clinic}`;
    const queueList = await env.KV_QUEUES.get(listKey, 'json') || [];
    
    // Find patient in queue
    const patientIndex = queueList.findIndex(item => item.user === patientId);
    
    if (patientIndex === -1) {
      return jsonResponse({
        success: false,
        error: 'لست في طابور هذه العيادة',
        message: 'Not in queue for this clinic'
      }, 404);
    }
    
    const patientEntry = queueList[patientIndex];
    
    // DYNAMIC CALCULATION:
    // Display position = how many people are waiting before me + 1
    const displayPosition = patientIndex + 1;
    const aheadOfMe = patientIndex;
    const totalWaiting = queueList.length;
    
    // Get patient's permanent number (stored in database)
    const permanentNumber = patientEntry.number;
    
    return jsonResponse({
      success: true,
      clinic: clinic,
      patientId: patientId,
      
      // What patient sees on screen (DYNAMIC)
      display: {
        position: displayPosition,
        message: `رقمك الحالي: ${displayPosition}`,
        ahead: aheadOfMe,
        total_waiting: totalWaiting
      },
      
      // What's stored in database (PERMANENT)
      database: {
        permanent_number: permanentNumber,
        status: patientEntry.status,
        entered_at: patientEntry.entered_at
      },
      
      timestamp: new Date().toISOString()
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
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Max-Age': '86400'
    }
  });
}


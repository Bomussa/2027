// Enhanced Dynamic Path Choose - Integration with new dynamic system
// GET /api/v1/path/choose-v2?exam=<type>&user=<id>
// This endpoint integrates with the new dynamic-assign system

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Access-Control-Allow-Origin': '*'
    }
  });
}

export async function onRequestGet(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const exam = url.searchParams.get('exam');
  const user = url.searchParams.get('user');

  if (!exam || !user) {
    return jsonResponse({
      success: false,
      error: 'exam and user parameters required'
    }, 400);
  }

  try {
    // Map old exam names to new exam types
    const examTypeMap = {
      'full': 'full',
      'عام': 'full',
      'basic': 'basic',
      'أساسي': 'basic',
      'women': 'women',
      'نساء': 'women',
      'recruitment': 'recruitment',
      'تجنيد': 'recruitment',
      'specialized': 'specialized',
      'متخصص': 'specialized'
    };
    
    const exam_type = examTypeMap[exam] || 'basic';
    
    // Call the dynamic-assign endpoint
    const assignUrl = new URL(request.url);
    assignUrl.pathname = '/api/v1/path/dynamic-assign';
    
    const assignResponse = await fetch(assignUrl.toString(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        user_id: user,
        exam_type: exam_type
      })
    });
    
    const assignData = await assignResponse.json();
    
    if (!assignData.success) {
      return jsonResponse({
        success: false,
        error: assignData.error || 'Failed to assign path'
      }, 500);
    }
    
    // Return in the format expected by the old API
    return jsonResponse({
      success: true,
      sticky: assignData.sticky,
      session_code: assignData.session_code,
      clinic_assigned: assignData.clinic_path,
      clinic_names: assignData.clinic_names,
      weights_used: assignData.weights_used,
      scores_calculated: assignData.scores_calculated,
      total_estimated_time: assignData.total_estimated_time_text,
      no_pin: assignData.no_pin,
      created_at: assignData.created_at,
      algorithm: assignData.algorithm,
      message: assignData.message
    });

  } catch (error) {
    return jsonResponse({
      success: false,
      error: error.message
    }, 500);
  }
}


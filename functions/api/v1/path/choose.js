// Dynamic Path Choose - Sticky per exam
// Calculates path once based on clinic weights and locks it
// GET /api/v1/path/choose?exam=<type>&user=<id>

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
    // Check if path already exists (Sticky)
    const pathKey = `path:${user}:${exam}`;
    const existingPath = await env.KV_ADMIN.get(pathKey, { type: 'json' });

    if (existingPath) {
      return jsonResponse({
        success: true,
        sticky: true,
        session_code: existingPath.session_code,
        clinic_assigned: existingPath.clinics,
        weights_used: existingPath.weights,
        created_at: existingPath.created_at
      });
    }

    // Get current queue lengths for weight calculation
    const clinics = ['lab', 'xray', 'eyes', 'internal', 'ent', 'derma', 'ortho', 'dental'];
    const weights = {};

    for (const clinic of clinics) {
      const queueData = await env.KV_QUEUES.get(`queue:${clinic}`, { type: 'json' });
      const waiting = queueData ? queueData.length : 0;
      weights[clinic] = waiting;
    }

    // Determine clinics based on exam type
    let selectedClinics = [];

    if (exam === 'full' || exam === 'عام') {
      // Full exam: all clinics
      selectedClinics = ['lab', 'xray', 'eyes', 'internal', 'ent', 'derma'];
    } else if (exam === 'basic' || exam === 'أساسي') {
      // Basic: lab, xray, internal only
      selectedClinics = ['lab', 'xray', 'internal'];
    } else if (exam === 'women' || exam === 'نساء') {
      // Women: special clinics with no_pin
      selectedClinics = ['lab', 'xray', 'internal_women', 'derma_women', 'eyes_women'];
    } else {
      // Default
      selectedClinics = ['lab', 'xray', 'internal'];
    }

    // Sort clinics by weight (ascending - prefer less crowded)
    selectedClinics.sort((a, b) => (weights[a] || 0) - (weights[b] || 0));

    // Generate session code
    const sessionCode = `${user.substring(0, 4)}-${exam.substring(0, 2)}-${Date.now().toString(36)}`;

    // Save path (Sticky)
    const pathData = {
      session_code: sessionCode,
      user: user,
      exam: exam,
      clinics: selectedClinics,
      weights: weights,
      created_at: new Date().toISOString(),
      sticky: true
    };

    await env.KV_ADMIN.put(pathKey, JSON.stringify(pathData), {
      expirationTtl: 86400 // 24 hours
    });

    return jsonResponse({
      success: true,
      sticky: true,
      session_code: sessionCode,
      clinic_assigned: selectedClinics,
      weights_used: weights,
      no_pin: exam.includes('women') || exam.includes('نساء')
    });

  } catch (error) {
    return jsonResponse({
      success: false,
      error: error.message
    }, 500);
  }
}


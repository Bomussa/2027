// Daily Report - Get daily statistics
// GET /api/v1/report/daily?format=json&date=YYYY-MM-DD

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
  const format = url.searchParams.get('format') || 'json';
  const date = url.searchParams.get('date') || new Date().toISOString().split('T')[0];

  try {
    const clinics = ['lab', 'xray', 'eyes', 'internal', 'ent', 'derma', 'ortho', 'dental'];
    const report = {
      date: date,
      clinics: []
    };

    for (const clinic of clinics) {
      // Get queue data
      const queueKey = `queue:${clinic}`;
      const queueData = await env.KV_QUEUES.get(queueKey, { type: 'json' });

      // Get PIN data
      const pinKey = `pins:${date}`;
      const pinData = await env.KV_PINS.get(pinKey, { type: 'json' });

      const clinicReport = {
        clinic: clinic,
        issued: queueData ? queueData.length : 0,
        done: queueData ? queueData.patients.filter(p => p.status === 'DONE').length : 0,
        waiting: queueData ? queueData.patients.filter(p => p.status === 'WAITING').length : 0,
        avg_wait: 0, // TODO: Calculate from timestamps
        pins_used: pinData && pinData[clinic] ? [pinData[clinic]] : [],
        date: date
      };

      report.clinics.push(clinicReport);
    }

    // Calculate totals
    report.totals = {
      issued: report.clinics.reduce((sum, c) => sum + c.issued, 0),
      done: report.clinics.reduce((sum, c) => sum + c.done, 0),
      waiting: report.clinics.reduce((sum, c) => sum + c.waiting, 0)
    };

    return jsonResponse({
      success: true,
      report: report
    });

  } catch (error) {
    return jsonResponse({
      success: false,
      error: error.message
    }, 500);
  }
}


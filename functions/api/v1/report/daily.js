/**
 * Daily Report Endpoint
 * GET /api/v1/report/daily?date=YYYY-MM-DD&format=json|csv|pdf
 * Generates daily report for all clinics
 */

export async function onRequestGet(context) {
  const { request, env } = context;
  
  try {
    const url = new URL(request.url);
    const dateParam = url.searchParams.get('date');
    const format = url.searchParams.get('format') || 'json';

    // Get date (default to today in Qatar timezone)
    const now = new Date();
    const qatarTime = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Qatar' }));
    const dateKey = dateParam || qatarTime.toISOString().split('T')[0];

    // Validate date format
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateKey)) {
      return jsonResponse({ error: 'Invalid date format. Use YYYY-MM-DD' }, 400);
    }

    // List of all clinics
    const clinics = [
      "المختبر", "الأشعة",
      "عيادة العيون", "عيادة الباطنية", "عيادة الأنف والأذن والحنجرة", "عيادة الجراحة العامة",
      "عيادة الأسنان", "عيادة النفسية", "عيادة الجلدية", "عيادة العظام والمفاصل",
      "غرفة القياسات الحيوية", "غرفة تخطيط القلب", "غرفة قياس السمع",
      "عيادة الباطنية (نساء)", "عيادة الجلدية (نساء)", "عيادة العيون (نساء)"
    ];

    const report = {
      date: dateKey,
      generated_at: new Date().toISOString(),
      clinics: [],
      summary: {
        total_pins_issued: 0,
        total_patients_served: 0,
        total_patients_waiting: 0,
        avg_wait_time_minutes: 0,
        total_wait_time_seconds: 0,
        clinics_count: clinics.length
      }
    };

    // Collect data for each clinic
    for (const clinic of clinics) {
      const pinsKey = `pins:${clinic}:${dateKey}`;
      const queueKey = `queue:${clinic}:${dateKey}`;

      const pinsData = await env.KV_PINS.get(pinsKey, { type: 'json' });
      const queueData = await env.KV_QUEUES.get(queueKey, { type: 'json' });

      const clinicReport = {
        clinic: clinic,
        pins_issued: pinsData?.issued || 0,
        pins_available: (pinsData?.available?.length || 0) + (pinsData?.reserve?.length || 0),
        reserve_mode: pinsData?.reserve_mode || false,
        patients_waiting: queueData?.queue?.filter(p => p.status === 'WAITING').length || 0,
        patients_in_service: queueData?.queue?.filter(p => p.status === 'IN_SERVICE').length || 0,
        patients_done: queueData?.queue?.filter(p => p.status === 'DONE').length || 0,
        avg_wait_seconds: queueData?.avg_wait_seconds || 0,
        current_pin: queueData?.current_pin || null,
        next_pin: queueData?.next_pin || null
      };

      report.clinics.push(clinicReport);

      // Update summary
      report.summary.total_pins_issued += clinicReport.pins_issued;
      report.summary.total_patients_served += clinicReport.patients_done;
      report.summary.total_patients_waiting += clinicReport.patients_waiting;
      report.summary.total_wait_time_seconds += clinicReport.avg_wait_seconds * clinicReport.patients_done;
    }

    // Calculate average wait time
    if (report.summary.total_patients_served > 0) {
      report.summary.avg_wait_time_minutes = Math.ceil(
        report.summary.total_wait_time_seconds / report.summary.total_patients_served / 60
      );
    }

    // Return based on format
    if (format === 'csv') {
      return generateCSV(report);
    } else if (format === 'pdf') {
      return jsonResponse({ 
        error: 'PDF generation not yet implemented',
        message: 'Use format=json or format=csv'
      }, 501);
    } else {
      return jsonResponse(report, 200);
    }

  } catch (error) {
    return jsonResponse({ error: error.message }, 500);
  }
}

function generateCSV(report) {
  let csv = 'Clinic,PINs Issued,PINs Available,Waiting,In Service,Done,Avg Wait (min)\n';
  
  for (const clinic of report.clinics) {
    csv += `"${clinic.clinic}",${clinic.pins_issued},${clinic.pins_available},${clinic.patients_waiting},${clinic.patients_in_service},${clinic.patients_done},${Math.ceil(clinic.avg_wait_seconds / 60)}\n`;
  }
  
  csv += `\nSummary\n`;
  csv += `Total PINs Issued,${report.summary.total_pins_issued}\n`;
  csv += `Total Patients Served,${report.summary.total_patients_served}\n`;
  csv += `Total Patients Waiting,${report.summary.total_patients_waiting}\n`;
  csv += `Average Wait Time (min),${report.summary.avg_wait_time_minutes}\n`;

  return new Response(csv, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv',
      'Content-Disposition': `attachment; filename="daily-report-${report.date}.csv"`,
      'Access-Control-Allow-Origin': '*'
    }
  });
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


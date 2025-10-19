/**
 * Monthly Report Endpoint
 * GET /api/v1/report/monthly?month=YYYY-MM&format=json|csv
 * Generates monthly report aggregating daily data
 */

export async function onRequestGet(context) {
  const { request, env } = context;
  
  try {
    const url = new URL(request.url);
    const format = url.searchParams.get('format') || 'json';
    const monthParam = url.searchParams.get('month'); // Format: YYYY-MM

    // Calculate month range
    let year, month;
    
    if (monthParam) {
      [year, month] = monthParam.split('-').map(Number);
    } else {
      const now = new Date();
      const qatarTime = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Qatar' }));
      year = qatarTime.getFullYear();
      month = qatarTime.getMonth() + 1;
    }

    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0); // Last day of month

    const report = {
      period: 'monthly',
      month: `${year}-${String(month).padStart(2, '0')}`,
      start_date: startDate.toISOString().split('T')[0],
      end_date: endDate.toISOString().split('T')[0],
      generated_at: new Date().toISOString(),
      daily_summaries: [],
      monthly_summary: {
        total_pins_issued: 0,
        total_patients_served: 0,
        avg_daily_patients: 0,
        peak_day: null,
        peak_day_patients: 0,
        working_days: 0
      }
    };

    const clinics = [
      "المختبر", "الأشعة",
      "عيادة العيون", "عيادة الباطنية", "عيادة الأنف والأذن والحنجرة", "عيادة الجراحة العامة",
      "عيادة الأسنان", "عيادة النفسية", "عيادة الجلدية", "عيادة العظام والمفاصل",
      "غرفة القياسات الحيوية", "غرفة تخطيط القلب", "غرفة قياس السمع",
      "عيادة الباطنية (نساء)", "عيادة الجلدية (نساء)", "عيادة العيون (نساء)"
    ];

    // Aggregate daily data for the month
    const currentDate = new Date(startDate);
    
    while (currentDate <= endDate) {
      const dateKey = currentDate.toISOString().split('T')[0];
      
      let dailyPins = 0;
      let dailyServed = 0;

      for (const clinic of clinics) {
        const pinsKey = `pins:${clinic}:${dateKey}`;
        const queueKey = `queue:${clinic}:${dateKey}`;

        const pinsData = await env.KV_PINS.get(pinsKey, { type: 'json' });
        const queueData = await env.KV_QUEUES.get(queueKey, { type: 'json' });

        dailyPins += pinsData?.issued || 0;
        dailyServed += queueData?.queue?.filter(p => p.status === 'DONE').length || 0;
      }

      if (dailyPins > 0 || dailyServed > 0) {
        report.monthly_summary.working_days++;
      }

      report.daily_summaries.push({
        date: dateKey,
        day_of_week: currentDate.toLocaleDateString('ar-QA', { weekday: 'long' }),
        pins_issued: dailyPins,
        patients_served: dailyServed
      });

      report.monthly_summary.total_pins_issued += dailyPins;
      report.monthly_summary.total_patients_served += dailyServed;

      // Track peak day
      if (dailyServed > report.monthly_summary.peak_day_patients) {
        report.monthly_summary.peak_day = dateKey;
        report.monthly_summary.peak_day_patients = dailyServed;
      }

      currentDate.setDate(currentDate.getDate() + 1);
    }

    // Calculate average
    if (report.monthly_summary.working_days > 0) {
      report.monthly_summary.avg_daily_patients = Math.ceil(
        report.monthly_summary.total_patients_served / report.monthly_summary.working_days
      );
    }

    // Return based on format
    if (format === 'csv') {
      return generateCSV(report);
    } else {
      return jsonResponse(report, 200);
    }

  } catch (error) {
    return jsonResponse({ error: error.message }, 500);
  }
}

function generateCSV(report) {
  let csv = 'Date,Day of Week,PINs Issued,Patients Served\n';
  
  for (const day of report.daily_summaries) {
    csv += `${day.date},${day.day_of_week},${day.pins_issued},${day.patients_served}\n`;
  }
  
  csv += `\nMonthly Summary\n`;
  csv += `Month,${report.month}\n`;
  csv += `Working Days,${report.monthly_summary.working_days}\n`;
  csv += `Total PINs Issued,${report.monthly_summary.total_pins_issued}\n`;
  csv += `Total Patients Served,${report.monthly_summary.total_patients_served}\n`;
  csv += `Average Daily Patients,${report.monthly_summary.avg_daily_patients}\n`;
  csv += `Peak Day,${report.monthly_summary.peak_day}\n`;
  csv += `Peak Day Patients,${report.monthly_summary.peak_day_patients}\n`;

  return new Response(csv, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv',
      'Content-Disposition': `attachment; filename="monthly-report-${report.month}.csv"`,
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


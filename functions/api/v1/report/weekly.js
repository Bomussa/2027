/**
 * Weekly Report Endpoint
 * GET /api/v1/report/weekly?week=YYYY-WW&format=json|csv
 * Generates weekly report aggregating daily data
 */

export async function onRequestGet(context) {
  const { request, env } = context;
  
  try {
    const url = new URL(request.url);
    const format = url.searchParams.get('format') || 'json';
    const weekParam = url.searchParams.get('week'); // Format: YYYY-WW

    // Calculate week range
    let startDate, endDate;
    
    if (weekParam) {
      // Parse YYYY-WW format
      const [year, week] = weekParam.split('-').map(Number);
      const firstDayOfYear = new Date(year, 0, 1);
      const daysOffset = (week - 1) * 7;
      startDate = new Date(firstDayOfYear.setDate(firstDayOfYear.getDate() + daysOffset));
      endDate = new Date(startDate);
      endDate.setDate(endDate.getDate() + 6);
    } else {
      // Default to current week
      const now = new Date();
      const qatarTime = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Qatar' }));
      const dayOfWeek = qatarTime.getDay();
      startDate = new Date(qatarTime);
      startDate.setDate(startDate.getDate() - dayOfWeek);
      endDate = new Date(startDate);
      endDate.setDate(endDate.getDate() + 6);
    }

    const report = {
      period: 'weekly',
      start_date: startDate.toISOString().split('T')[0],
      end_date: endDate.toISOString().split('T')[0],
      generated_at: new Date().toISOString(),
      daily_summaries: [],
      weekly_summary: {
        total_pins_issued: 0,
        total_patients_served: 0,
        avg_daily_patients: 0,
        peak_day: null,
        peak_day_patients: 0
      }
    };

    // Aggregate daily data for the week
    const currentDate = new Date(startDate);
    
    while (currentDate <= endDate) {
      const dateKey = currentDate.toISOString().split('T')[0];
      
      let dailyPins = 0;
      let dailyServed = 0;

      // Simplified aggregation - in production, call daily report API
      const clinics = [
        "المختبر", "الأشعة",
        "عيادة العيون", "عيادة الباطنية", "عيادة الأنف والأذن والحنجرة", "عيادة الجراحة العامة",
        "عيادة الأسنان", "عيادة النفسية", "عيادة الجلدية", "عيادة العظام والمفاصل",
        "غرفة القياسات الحيوية", "غرفة تخطيط القلب", "غرفة قياس السمع",
        "عيادة الباطنية (نساء)", "عيادة الجلدية (نساء)", "عيادة العيون (نساء)"
      ];

      for (const clinic of clinics) {
        const pinsKey = `pins:${clinic}:${dateKey}`;
        const queueKey = `queue:${clinic}:${dateKey}`;

        const pinsData = await env.KV_PINS.get(pinsKey, { type: 'json' });
        const queueData = await env.KV_QUEUES.get(queueKey, { type: 'json' });

        dailyPins += pinsData?.issued || 0;
        dailyServed += queueData?.queue?.filter(p => p.status === 'DONE').length || 0;
      }

      report.daily_summaries.push({
        date: dateKey,
        pins_issued: dailyPins,
        patients_served: dailyServed
      });

      report.weekly_summary.total_pins_issued += dailyPins;
      report.weekly_summary.total_patients_served += dailyServed;

      // Track peak day
      if (dailyServed > report.weekly_summary.peak_day_patients) {
        report.weekly_summary.peak_day = dateKey;
        report.weekly_summary.peak_day_patients = dailyServed;
      }

      currentDate.setDate(currentDate.getDate() + 1);
    }

    // Calculate average
    report.weekly_summary.avg_daily_patients = Math.ceil(
      report.weekly_summary.total_patients_served / report.daily_summaries.length
    );

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
  let csv = 'Date,PINs Issued,Patients Served\n';
  
  for (const day of report.daily_summaries) {
    csv += `${day.date},${day.pins_issued},${day.patients_served}\n`;
  }
  
  csv += `\nWeekly Summary\n`;
  csv += `Total PINs Issued,${report.weekly_summary.total_pins_issued}\n`;
  csv += `Total Patients Served,${report.weekly_summary.total_patients_served}\n`;
  csv += `Average Daily Patients,${report.weekly_summary.avg_daily_patients}\n`;
  csv += `Peak Day,${report.weekly_summary.peak_day}\n`;
  csv += `Peak Day Patients,${report.weekly_summary.peak_day_patients}\n`;

  return new Response(csv, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv',
      'Content-Disposition': `attachment; filename="weekly-report-${report.start_date}-to-${report.end_date}.csv"`,
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


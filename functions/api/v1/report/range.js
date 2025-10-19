/**
 * Custom Range Report Endpoint
 * GET /api/v1/report/range?start=YYYY-MM-DD&end=YYYY-MM-DD&format=json|csv
 * Generates report for custom date range
 */

export async function onRequestGet(context) {
  const { request, env } = context;
  
  try {
    const url = new URL(request.url);
    const format = url.searchParams.get('format') || 'json';
    const startParam = url.searchParams.get('start');
    const endParam = url.searchParams.get('end');

    if (!startParam || !endParam) {
      return jsonResponse({ 
        error: 'Missing required parameters: start and end dates',
        example: '/api/v1/report/range?start=2025-10-01&end=2025-10-15'
      }, 400);
    }

    // Validate date format
    if (!/^\d{4}-\d{2}-\d{2}$/.test(startParam) || !/^\d{4}-\d{2}-\d{2}$/.test(endParam)) {
      return jsonResponse({ error: 'Invalid date format. Use YYYY-MM-DD' }, 400);
    }

    const startDate = new Date(startParam);
    const endDate = new Date(endParam);

    if (startDate > endDate) {
      return jsonResponse({ error: 'Start date must be before or equal to end date' }, 400);
    }

    // Limit range to 90 days
    const daysDiff = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24));
    if (daysDiff > 90) {
      return jsonResponse({ error: 'Date range cannot exceed 90 days' }, 400);
    }

    const report = {
      period: 'custom_range',
      start_date: startParam,
      end_date: endParam,
      days_count: daysDiff + 1,
      generated_at: new Date().toISOString(),
      daily_summaries: [],
      range_summary: {
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

    // Aggregate daily data for the range
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
        report.range_summary.working_days++;
      }

      report.daily_summaries.push({
        date: dateKey,
        day_of_week: currentDate.toLocaleDateString('ar-QA', { weekday: 'long' }),
        pins_issued: dailyPins,
        patients_served: dailyServed
      });

      report.range_summary.total_pins_issued += dailyPins;
      report.range_summary.total_patients_served += dailyServed;

      // Track peak day
      if (dailyServed > report.range_summary.peak_day_patients) {
        report.range_summary.peak_day = dateKey;
        report.range_summary.peak_day_patients = dailyServed;
      }

      currentDate.setDate(currentDate.getDate() + 1);
    }

    // Calculate average
    if (report.range_summary.working_days > 0) {
      report.range_summary.avg_daily_patients = Math.ceil(
        report.range_summary.total_patients_served / report.range_summary.working_days
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
  
  csv += `\nRange Summary\n`;
  csv += `Start Date,${report.start_date}\n`;
  csv += `End Date,${report.end_date}\n`;
  csv += `Days Count,${report.days_count}\n`;
  csv += `Working Days,${report.range_summary.working_days}\n`;
  csv += `Total PINs Issued,${report.range_summary.total_pins_issued}\n`;
  csv += `Total Patients Served,${report.range_summary.total_patients_served}\n`;
  csv += `Average Daily Patients,${report.range_summary.avg_daily_patients}\n`;
  csv += `Peak Day,${report.range_summary.peak_day}\n`;
  csv += `Peak Day Patients,${report.range_summary.peak_day_patients}\n`;

  return new Response(csv, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv',
      'Content-Disposition': `attachment; filename="range-report-${report.start_date}-to-${report.end_date}.csv"`,
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


/**
 * Admin Report Export Endpoint
 * POST /api/v1/admin/report/export
 * Exports report to R2 bucket and returns download URL
 */

export async function onRequestPost(context) {
  const { request, env } = context;
  
  try {
    // TODO: Add JWT authentication check

    const body = await request.json();
    const { type, date, start, end, format = 'json' } = body;

    if (!type) {
      return jsonResponse({ error: 'Report type required (daily, weekly, monthly, range)' }, 400);
    }

    let reportData;
    let filename;

    // Generate report based on type
    switch (type) {
      case 'daily':
        if (!date) {
          return jsonResponse({ error: 'Date required for daily report' }, 400);
        }
        reportData = await generateDailyReport(env, date);
        filename = `daily-${date}.${format}`;
        break;

      case 'weekly':
        reportData = await generateWeeklyReport(env, date);
        filename = `weekly-${date || 'current'}.${format}`;
        break;

      case 'monthly':
        reportData = await generateMonthlyReport(env, date);
        filename = `monthly-${date || 'current'}.${format}`;
        break;

      case 'range':
        if (!start || !end) {
          return jsonResponse({ error: 'Start and end dates required for range report' }, 400);
        }
        reportData = await generateRangeReport(env, start, end);
        filename = `range-${start}-to-${end}.${format}`;
        break;

      default:
        return jsonResponse({ error: 'Invalid report type' }, 400);
    }

    // Convert to requested format
    let content;
    let contentType;

    if (format === 'csv') {
      content = convertToCSV(reportData);
      contentType = 'text/csv';
    } else {
      content = JSON.stringify(reportData, null, 2);
      contentType = 'application/json';
    }

    // Upload to R2
    const r2Key = `reports/${new Date().toISOString().split('T')[0]}/${filename}`;
    
    if (env.R2_REPORTS) {
      await env.R2_REPORTS.put(r2Key, content, {
        httpMetadata: {
          contentType: contentType
        },
        customMetadata: {
          generated_at: new Date().toISOString(),
          report_type: type
        }
      });

      // Log export event
      await logEvent(env.KV_EVENTS, {
        type: 'REPORT_EXPORTED',
        report_type: type,
        filename: filename,
        r2_key: r2Key,
        timestamp: new Date().toISOString()
      });

      return jsonResponse({
        success: true,
        filename: filename,
        r2_key: r2Key,
        size_bytes: content.length,
        download_url: `/api/v1/admin/report/download?key=${encodeURIComponent(r2Key)}`,
        message: 'تم تصدير التقرير بنجاح'
      }, 200);
    } else {
      return jsonResponse({
        error: 'R2 bucket not configured',
        message: 'R2_REPORTS binding is missing'
      }, 500);
    }

  } catch (error) {
    return jsonResponse({ error: error.message }, 500);
  }
}

async function generateDailyReport(env, date) {
  // Simplified - in production, call the daily report API
  return { type: 'daily', date, generated_at: new Date().toISOString() };
}

async function generateWeeklyReport(env, week) {
  return { type: 'weekly', week, generated_at: new Date().toISOString() };
}

async function generateMonthlyReport(env, month) {
  return { type: 'monthly', month, generated_at: new Date().toISOString() };
}

async function generateRangeReport(env, start, end) {
  return { type: 'range', start, end, generated_at: new Date().toISOString() };
}

function convertToCSV(data) {
  // Simplified CSV conversion
  return JSON.stringify(data);
}

async function logEvent(kvEvents, event) {
  try {
    const eventKey = `event:export:${Date.now()}`;
    await kvEvents.put(eventKey, JSON.stringify(event), {
      expirationTtl: 30 * 24 * 60 * 60
    });
  } catch (error) {
    console.error('Event logging failed:', error);
  }
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


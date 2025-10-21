// Complete clinic examination with PIN verification
// POST /api/v1/queue/done
// Body: { clinic, user, pin }

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Access-Control-Allow-Origin': '*'
    }
  });
}

// Get current date in Qatar timezone
function getQatarDate() {
  const now = new Date();
  const qatarTime = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Qatar' }));
  return qatarTime.toISOString().split('T')[0];
}

export async function onRequestPost(context) {
  const { request, env } = context;

  try {
    const body = await request.json().catch(() => ({}));
    const { clinic, user, pin } = body;

    // Validate required fields
    if (!clinic || !user) {
      return jsonResponse({
        success: false,
        error: 'clinic and user required'
      }, 400);
    }

    if (!pin) {
      return jsonResponse({
        success: false,
        error: 'PIN required - proof of examination completion'
      }, 400);
    }

    const kv = env.KV_QUEUES;
    const kvPins = env.KV_PINS;
    
    // Get user's queue entry
    const userKey = `queue:user:${clinic}:${user}`;
    const userQueue = await kv.get(userKey, 'json');
    
    if (!userQueue) {
      return jsonResponse({
        success: false,
        error: 'User not in queue'
      }, 404);
    }
    
    // Get today's PIN for this clinic
    const today = getQatarDate();
    const pinKey = `pins:daily:${today}`;
    const dailyPins = await kvPins.get(pinKey, 'json');
    
    if (!dailyPins) {
      return jsonResponse({
        success: false,
        error: 'Daily PINs not generated yet'
      }, 500);
    }
    
    // Get expected PIN for this clinic
    const expectedPin = dailyPins[clinic];
    
    if (!expectedPin) {
      return jsonResponse({
        success: false,
        error: `PIN not configured for clinic: ${clinic}`
      }, 500);
    }
    
    // Verify PIN matches - STRICT COMPARISON
    const inputPin = String(pin).trim();
    const correctPin = String(expectedPin).trim();
    
    if (inputPin !== correctPin) {
      console.log(`❌ PIN MISMATCH: Expected "${correctPin}", Got "${inputPin}" for clinic ${clinic}`);
      return jsonResponse({
        success: false,
        error: 'Invalid PIN - examination not completed',
        expected: correctPin,
        received: inputPin
      }, 403);
    }
    
    console.log(`✅ PIN VERIFIED: "${inputPin}" for clinic ${clinic}`);
    
    // Mark as done with detailed timestamps and duration
    const exitNow = new Date();
    userQueue.status = 'DONE';
    userQueue.done_at = exitNow.toISOString();
    userQueue.exit_date = exitNow.toISOString().split('T')[0];
    userQueue.exit_time = exitNow.toISOString();
    userQueue.pin_used = inputPin;
    userQueue.pin_verified = true;
    
    // Calculate duration in minutes
    if (userQueue.entry_time) {
      const entryTime = new Date(userQueue.entry_time);
      const durationMs = exitNow - entryTime;
      userQueue.duration_minutes = Math.round(durationMs / 60000);
    }
    
    await kv.put(userKey, JSON.stringify(userQueue), {
      expirationTtl: 86400
    });
    
    // Update queue status - set current to this user's number
    const statusKey = `queue:status:${clinic}`;
    const status = await kv.get(statusKey, 'json') || { current: null, served: [] };
    
    status.current = userQueue.number;
    if (!status.served) status.served = [];
    status.served.push({
      number: userQueue.number,
      user: user,
      completed_at: exitNow.toISOString(),
      duration_minutes: userQueue.duration_minutes || 0
    });
    
    await kv.put(statusKey, JSON.stringify(status), {
      expirationTtl: 3600 // 1 hour
    });

    return jsonResponse({
      success: true,
      clinic: clinic,
      user: user,
      number: userQueue.number,
      status: 'DONE',
      duration_minutes: userQueue.duration_minutes || 0,
      entry_time: userQueue.entry_time,
      exit_time: userQueue.exit_time,
      pin_verified: true,
      next_clinic_unlocked: true
    });

  } catch (error) {
    console.error('Queue done error:', error);
    return jsonResponse({
      success: false,
      error: error.message || 'Internal server error'
    }, 500);
  }
}


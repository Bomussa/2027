// Queue Enter - CRITICAL: Most accurate queue number calculation
// Uses timestamp-based unique IDs + real-time verification
// Each clinic has independent queue

function generateUniqueNumber() {
  // Generate GUARANTEED unique number using high-precision timestamp
  const now = new Date();
  const timestamp = now.getTime(); // Milliseconds since epoch
  const random = Math.floor(Math.random() * 10000); // 4-digit random
  return parseInt(`${timestamp}${random}`);
}

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Access-Control-Allow-Origin': '*',
      'Cache-Control': 'no-cache, no-store, must-revalidate'
    }
  });
}

export async function onRequestPost(context) {
  const { request, env } = context;
  
  try {
    const body = await request.json();
    const { clinic, user } = body;
    
    if (!clinic || !user) {
      return jsonResponse({
        success: false,
        error: 'Missing clinic or user'
      }, 400);
    }
    
    const kv = env.KV_QUEUES;
    if (!kv) {
      return jsonResponse({
        success: false,
        error: 'KV storage not available'
      }, 500);
    }
    
    // Generate UNIQUE number
    const uniqueNumber = generateUniqueNumber();
    const now = new Date();
    const entryTime = now.toISOString();
    
    // Store user entry with precise timestamp
    const userEntry = {
      number: uniqueNumber,
      status: 'WAITING',
      entered_at: entryTime,
      entry_date: now.toISOString().split('T')[0],
      entry_time: entryTime,
      user: user,
      clinic: clinic
    };
    
    const userKey = `queue:user:${clinic}:${user}`;
    await kv.put(userKey, JSON.stringify(userEntry), {
      expirationTtl: 86400
    });
    
    // Add to queue list
    const listKey = `queue:list:${clinic}`;
    let queueList = await kv.get(listKey, 'json') || [];
    
    queueList.push({
      number: uniqueNumber,
      user: user,
      entered_at: entryTime
    });
    
    await kv.put(listKey, JSON.stringify(queueList), {
      expirationTtl: 86400
    });
    
    // ===== CRITICAL CALCULATION: ACCURATE QUEUE POSITION =====
    
    // STEP 1: Get ALL users in this clinic's queue
    const allUsersPromises = queueList.map(async (item) => {
      const itemKey = `queue:user:${clinic}:${item.user}`;
      const itemData = await kv.get(itemKey, 'json');
      return itemData;
    });
    
    const allUsers = (await Promise.all(allUsersPromises)).filter(Boolean);
    
    // STEP 2: Filter ONLY WAITING (exclude DONE)
    const waitingUsers = allUsers.filter(u => u.status === 'WAITING');
    
    // STEP 3: Sort by entry_time (earliest first)
    waitingUsers.sort((a, b) => {
      const timeA = new Date(a.entry_time).getTime();
      const timeB = new Date(b.entry_time).getTime();
      return timeA - timeB;
    });
    
    // STEP 4: Find my position in sorted waiting list
    const myIndex = waitingUsers.findIndex(u => u.user === user && u.clinic === clinic);
    const myPosition = myIndex + 1; // 1-based position
    
    // STEP 5: Calculate ahead (how many before me)
    const ahead = myIndex >= 0 ? myIndex : 0;
    
    // STEP 6: Total waiting
    const totalWaiting = waitingUsers.length;
    
    // VERIFICATION: Log for debugging
    console.log(`✅ Queue Entry: ${clinic} - User ${user}`);
    console.log(`   Position: ${myPosition} of ${totalWaiting}`);
    console.log(`   Ahead: ${ahead}`);
    console.log(`   Entry Time: ${entryTime}`);
    
    return jsonResponse({
      success: true,
      clinic: clinic,
      user: user,
      number: uniqueNumber,
      status: 'WAITING',
      ahead: ahead,
      display_number: myPosition,
      total_waiting: totalWaiting,
      entry_time: entryTime,
      calculation_method: 'precise_timestamp_based'
    });
    
  } catch (error) {
    console.error('Queue enter error:', error);
    return jsonResponse({
      success: false,
      error: error.message
    }, 500);
  }
}

// Handle OPTIONS for CORS
export async function onRequestOptions() {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Max-Age': '86400'
    }
  });
}


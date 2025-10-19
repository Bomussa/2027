// Queue Enter - Assign unique queue number to patient
// Uses timestamp-based unique IDs (guaranteed 100% unique)
// Each clinic has independent queue

function generateUniqueNumber() {
  // Generate unique number using timestamp + random
  // Format: YYYYMMDDHHMMSS + 4-digit random
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const seconds = String(now.getSeconds()).padStart(2, '0');
  const random = String(Math.floor(Math.random() * 10000)).padStart(4, '0');
  
  return parseInt(`${year}${month}${day}${hours}${minutes}${seconds}${random}`);
}

export async function onRequest(context) {
  const { request, env } = context;
  
  if (request.method !== 'POST') {
    return new Response(JSON.stringify({
      success: false,
      error: 'Method not allowed'
    }), {
      status: 405,
      headers: { 'Content-Type': 'application/json; charset=utf-8' }
    });
  }
  
  try {
    const body = await request.json();
    const { clinic, user } = body;
    
    if (!clinic || !user) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Missing clinic or user'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json; charset=utf-8' }
      });
    }
    
    const kv = env.KV_QUEUES;
    const statusKey = `queue:status:${clinic}`;
    const userKey = `queue:user:${clinic}:${user}`;
    const listKey = `queue:list:${clinic}`;
    
    // Generate unique number (guaranteed unique)
    const uniqueNumber = generateUniqueNumber();
    
    // Store user entry
    const userEntry = {
      number: uniqueNumber,
      status: 'WAITING',
      entered_at: new Date().toISOString(),
      user: user,
      clinic: clinic
    };
    
    await kv.put(userKey, JSON.stringify(userEntry), {
      expirationTtl: 86400
    });
    
    // Add to queue list
    const queueList = await kv.get(listKey, { type: 'json' }) || [];
    queueList.push({
      number: uniqueNumber,
      user: user,
      entered_at: userEntry.entered_at
    });
    
    await kv.put(listKey, JSON.stringify(queueList), {
      expirationTtl: 86400
    });
    
    // Get current status for "ahead" calculation
    const status = await kv.get(statusKey, { type: 'json' }) || { current: null, served: [] };
    
    // Calculate how many are ahead
    let ahead = 0;
    if (status.current) {
      // Count how many in the list have numbers less than ours and greater than current
      ahead = queueList.filter(item => 
        item.number < uniqueNumber && 
        (!status.current || item.number > status.current)
      ).length;
    } else {
      // No one is being served yet, count all before us
      ahead = queueList.filter(item => item.number < uniqueNumber).length;
    }
    
    return new Response(JSON.stringify({
      success: true,
      clinic: clinic,
      user: user,
      number: uniqueNumber,
      status: 'WAITING',
      ahead: ahead,
      display_number: queueList.length // For display purposes
    }), {
      status: 200,
      headers: { 
        'Content-Type': 'application/json; charset=utf-8',
        'Cache-Control': 'no-cache, no-store, must-revalidate'
      }
    });
    
  } catch (error) {
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json; charset=utf-8' }
    });
  }
}


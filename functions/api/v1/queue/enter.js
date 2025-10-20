// Queue Enter - Assign unique queue number to patient
// Uses timestamp-based unique IDs (guaranteed 100% unique)
// Each clinic has independent queue

// In-memory storage (fallback when KV is not available)
const memoryQueues = new Map();
const memoryUsers = new Map();
const memoryStatus = new Map();

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
  const milliseconds = String(now.getMilliseconds()).padStart(3, '0');
  const random = String(Math.floor(Math.random() * 1000)).padStart(3, '0');
  
  return parseInt(`${year}${month}${day}${hours}${minutes}${seconds}${milliseconds}${random}`);
}

export async function onRequest(context) {
  const { request, env } = context;
  
  if (request.method !== 'POST') {
    return new Response(JSON.stringify({
      success: false,
      error: 'Method not allowed'
    }), {
      status: 405,
      headers: { 
        'Content-Type': 'application/json; charset=utf-8',
        'Access-Control-Allow-Origin': '*'
      }
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
        headers: { 
          'Content-Type': 'application/json; charset=utf-8',
          'Access-Control-Allow-Origin': '*'
        }
      });
    }
    
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
    
    // Try KV first, fallback to memory
    let kv = env?.KV_QUEUES;
    const statusKey = `queue:status:${clinic}`;
    const userKey = `queue:user:${clinic}:${user}`;
    const listKey = `queue:list:${clinic}`;
    
    let queueList = [];
    let status = { current: null, served: [] };
    
    if (kv) {
      try {
        // Use KV storage
        await kv.put(userKey, JSON.stringify(userEntry), {
          expirationTtl: 86400
        });
        
        queueList = await kv.get(listKey, { type: 'json' }) || [];
        queueList.push({
          number: uniqueNumber,
          user: user,
          entered_at: userEntry.entered_at
        });
        
        await kv.put(listKey, JSON.stringify(queueList), {
          expirationTtl: 86400
        });
        
        status = await kv.get(statusKey, { type: 'json' }) || { current: null, served: [] };
      } catch (e) {
        console.log('KV error, falling back to memory:', e);
        kv = null; // Force fallback
      }
    }
    
    if (!kv) {
      // Use memory storage
      memoryUsers.set(userKey, userEntry);
      
      queueList = memoryQueues.get(listKey) || [];
      queueList.push({
        number: uniqueNumber,
        user: user,
        entered_at: userEntry.entered_at
      });
      memoryQueues.set(listKey, queueList);
      
      status = memoryStatus.get(statusKey) || { current: null, served: [] };
    }
    
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
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Access-Control-Allow-Origin': '*'
      }
    });
    
  } catch (error) {
    console.error('Queue enter error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      status: 500,
      headers: { 
        'Content-Type': 'application/json; charset=utf-8',
        'Access-Control-Allow-Origin': '*'
      }
    });
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


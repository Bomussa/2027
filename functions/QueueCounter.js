// Durable Object for Queue Counter
// Ensures atomic increment of queue numbers per clinic
// Each clinic gets its own DO instance for complete isolation

export class QueueCounter {
  constructor(state, env) {
    this.state = state;
    this.storage = state.storage;
    this.env = env;
  }

  async fetch(request) {
    const url = new URL(request.url);
    const path = url.pathname;
    
    // Keys for storage
    const COUNTER_KEY = "counter";
    const CURRENT_KEY = "current";
    
    // Initialize if needed
    if (!(await this.storage.get(COUNTER_KEY))) {
      await this.storage.put(COUNTER_KEY, 0);
    }
    if (!(await this.storage.get(CURRENT_KEY))) {
      await this.storage.put(CURRENT_KEY, 0);
    }
    
    // Handle /enter - Assign new queue number
    if (path.endsWith("/enter") && request.method === "POST") {
      try {
        // Atomic increment - DO ensures serial processing
        let counter = (await this.storage.get(COUNTER_KEY)) || 0;
        counter++;
        await this.storage.put(COUNTER_KEY, counter);
        
        const body = await request.json().catch(() => ({}));
        const user = body?.user || null;
        const clinic = body?.clinic || null;
        
        // Store user info in KV for persistence
        if (user && clinic && this.env.KV_QUEUES) {
          const userKey = `queue:user:${clinic}:${user}`;
          await this.env.KV_QUEUES.put(userKey, JSON.stringify({
            number: counter,
            status: 'WAITING',
            entered_at: new Date().toISOString()
          }), {
            expirationTtl: 86400 // 24 hours
          });
        }
        
        const current = (await this.storage.get(CURRENT_KEY)) || 0;
        const ahead = Math.max(0, counter - current - 1);
        
        return new Response(JSON.stringify({
          success: true,
          number: counter,
          status: "WAITING",
          user: user,
          ahead: ahead
        }), {
          headers: { 'Content-Type': 'application/json; charset=utf-8' }
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
    
    // Handle /status - Get current queue status
    if (path.endsWith("/status") && request.method === "GET") {
      const counter = (await this.storage.get(COUNTER_KEY)) || 0;
      const current = (await this.storage.get(CURRENT_KEY)) || 0;
      const waiting = Math.max(counter - current, 0);
      
      return new Response(JSON.stringify({
        success: true,
        current: current,
        length: counter,
        waiting: waiting
      }), {
        headers: { 'Content-Type': 'application/json; charset=utf-8' }
      });
    }
    
    // Handle /done - Advance current number
    if (path.endsWith("/done") && request.method === "POST") {
      let current = (await this.storage.get(CURRENT_KEY)) || 0;
      current++;
      await this.storage.put(CURRENT_KEY, current);
      
      return new Response(JSON.stringify({
        success: true,
        current: current
      }), {
        headers: { 'Content-Type': 'application/json; charset=utf-8' }
      });
    }
    
    // Handle /reset - Reset counters (for daily reset)
    if (path.endsWith("/reset") && request.method === "POST") {
      await this.storage.put(COUNTER_KEY, 0);
      await this.storage.put(CURRENT_KEY, 0);
      
      return new Response(JSON.stringify({
        success: true,
        message: "Counters reset"
      }), {
        headers: { 'Content-Type': 'application/json; charset=utf-8' }
      });
    }
    
    return new Response("Not found", { status: 404 });
  }
}


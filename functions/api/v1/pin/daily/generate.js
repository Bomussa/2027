// Generate daily PINs for all clinics
// PINs change every day and are NOT sequential

import { getKV } from '../../../../lib/kv.js';

// List of all clinics
const CLINICS = [
  'lab', 'vitals', 'xray', 'eyes', 'internal', 
  'surgery', 'bones', 'ent', 'women', 'psychiatry', 'derma'
];

// Generate a random 2-digit PIN
function generateRandomPin() {
  return String(Math.floor(Math.random() * 90) + 10); // 10-99
}

// Generate unique PINs for all clinics
function generateDailyPins() {
  const pins = {};
  const usedPins = new Set();
  
  for (const clinic of CLINICS) {
    let pin;
    do {
      pin = generateRandomPin();
    } while (usedPins.has(pin));
    
    usedPins.add(pin);
    pins[clinic] = pin;
  }
  
  return pins;
}

export async function onRequest(context) {
  const { request, env } = context;
  
  // Only allow POST
  if (request.method !== 'POST') {
    return new Response(JSON.stringify({ 
      success: false, 
      error: 'Method not allowed' 
    }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' }
    });
  }
  
  try {
    const kv = getKV(env);
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    
    // Check if PINs already exist for today
    const existingPins = await kv.get(`pins:daily:${today}`, 'json');
    
    if (existingPins) {
      return new Response(JSON.stringify({
        success: true,
        message: 'PINs already exist for today',
        date: today,
        pins: existingPins
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    // Generate new PINs
    const pins = generateDailyPins();
    
    // Store in KV (expires at end of day)
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    const expirationTtl = Math.floor((tomorrow - new Date()) / 1000);
    
    await kv.put(
      `pins:daily:${today}`,
      JSON.stringify(pins),
      { expirationTtl: Math.max(expirationTtl, 3600) } // At least 1 hour
    );
    
    return new Response(JSON.stringify({
      success: true,
      message: 'Daily PINs generated successfully',
      date: today,
      pins: pins
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
    
  } catch (error) {
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}


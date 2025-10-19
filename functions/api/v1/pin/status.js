// Get daily PINs for all clinics
// PINs are static per clinic and change daily at 05:00 Asia/Qatar

import { getKV } from '../../../lib/kv.js';

const CLINICS = [
  'lab', 'xray', 'eyes', 'internal', 'ent', 'surgery', 
  'dental', 'psychiatry', 'derma', 'bones', 'vitals', 'ecg', 'audio',
  'women_internal', 'women_derma', 'women_eyes'
];

// Generate random 2-digit PIN
function generatePin() {
  return String(Math.floor(Math.random() * 90) + 10);
}

// Generate unique PINs for all clinics
function generateDailyPins() {
  const pins = {};
  const used = new Set();
  
  for (const clinic of CLINICS) {
    let pin;
    do {
      pin = generatePin();
    } while (used.has(pin));
    used.add(pin);
    pins[clinic] = pin;
  }
  
  return pins;
}

// Get current date in Asia/Qatar timezone
function getQatarDate() {
  const now = new Date();
  const qatarTime = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Qatar' }));
  return qatarTime.toISOString().split('T')[0];
}

export async function onRequest(context) {
  const { env } = context;
  
  try {
    const kv = getKV(env);
    const today = getQatarDate();
    const key = `pins:daily:${today}`;
    
    // Try to get existing PINs
    let pins = await kv.get(key, 'json');
    
    // If no PINs exist, generate them
    if (!pins) {
      pins = generateDailyPins();
      
      // Calculate expiration (next day at 05:00)
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(5, 0, 0, 0);
      const expirationTtl = Math.floor((tomorrow - new Date()) / 1000);
      
      await kv.put(key, JSON.stringify(pins), {
        expirationTtl: Math.max(expirationTtl, 3600)
      });
    }
    
    return new Response(JSON.stringify({
      success: true,
      date: today,
      reset_time: "05:00",
      timezone: "Asia/Qatar",
      pins: pins
    }), {
      status: 200,
      headers: { 
        'Content-Type': 'application/json; charset=utf-8',
        'Cache-Control': 'public, max-age=3600'
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


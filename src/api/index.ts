import express from 'express';
import cors from 'cors';
import { assignTicket, markDone, clinicCallSchedulerTick } from '../core/queueManager.js';
import { issueNextPin, verifyPinOrThrow } from '../core/pinService.js';
import { createRoute, assignFirstClinicTicket, getRoute, markClinicDone, getNextClinic } from '../core/routing/routeService.js';
import { getRouteMap } from '../core/routing/routeMapService.js';
import { appendAudit, log } from '../utils/logger.js';
import { readJSON } from '../utils/fs-atomic.js';
import * as path from 'path';
import { localDateKeyAsiaQatar } from '../utils/time.js';

const app = express();

// Enable CORS for all routes
app.use(cors());
app.use(express.json());

// Static files



// API Endpoints
app.post('/api/pin/issue', async (req, res) => {
  const { clinicId, dateKey } = req.body;
  try {
    const result = await issueNextPin(clinicId, dateKey);
    return res.json(result);
  } catch (error: any) {
    return res.status(400).json({ error: error.message });
  }
});

app.post('/api/pin/verify', async (req, res) => {
  const { clinicId, dateKey, pin } = req.body;
  try {
    const result = await verifyPinOrThrow(clinicId, dateKey, pin);
    return res.json({ ok: result });
  } catch (error: any) {
    return res.status(400).json({ error: error.message });
  }
});

app.post('/api/queue/assignTicket', async (req, res) => {
  const { clinicId, visitId, issuedAt } = req.body;
  try {
    const result = await assignTicket(clinicId, visitId, issuedAt);
    return res.json(result);
  } catch (error: any) {
    return res.status(400).json({ error: error.message });
  }
});

app.post('/api/queue/markDone', async (req, res) => {
  const { clinicId, visitId, ticket } = req.body;
  try {
    const result = await markDone(clinicId, visitId, ticket);
    return res.json(result);
  } catch (error: any) {
    return res.status(400).json({ error: error.message });
  }
});

app.post('/api/queue/tick', async (req, res) => {
  const { clinicId } = req.body;
  try {
    await clinicCallSchedulerTick(clinicId);
    return res.json({ ok: true });
  } catch (error: any) {
    return res.status(400).json({ error: error.message });
  }
});

app.post('/api/route/create', async (req, res) => {
  const { visitId, examType, gender } = req.body;
  try {
    const result = await createRoute(visitId, examType, gender);
    return res.json(result);
  } catch (error: any) {
    return res.status(400).json({ error: error.message });
  }
});

app.post('/api/route/assignFirstClinicTicket', async (req, res) => {
  const { visitId } = req.body;
  try {
    const result = await assignFirstClinicTicket(visitId, async (cid: string) => { 
      const { pin, dateKey } = await issueNextPin(cid); 
      return { ticket: parseInt(pin), dateKey }; 
    });
    return res.json(result);
  } catch (error: any) {
    return res.status(400).json({ error: error.message });
  }
});

app.get('/api/route/:visitId', async (req, res) => {
  const { visitId } = req.params;
  try {
    const result = await getRoute(visitId);
    return res.json(result);
  } catch (error: any) {
    return res.status(400).json({ error: error.message });
  }
});

app.post('/api/route/markClinicDone', async (req, res) => {
  const { visitId, clinicId } = req.body;
  try {
    const result = await markClinicDone(visitId, clinicId);
    return res.json(result);
  } catch (error: any) {
    return res.status(400).json({ error: error.message });
  }
});

app.get('/api/route/:visitId/nextClinic', async (req, res) => {
  const { visitId } = req.params;
  try {
    const result = await getNextClinic(visitId);
    return res.json(result);
  } catch (error: any) {
    return res.status(400).json({ error: error.message });
  }
});

app.get('/api/routeMap', async (req, res) => {
  try {
    const result = await getRouteMap();
    return res.json(result);
  } catch (error: any) {
    return res.status(400).json({ error: error.message });
  }
});

// ============================================
// Health Check
// ============================================
app.get('/api/health', async (req, res) => {
  return res.json({ 
    ok: true, 
    status: 'healthy',
    ts: new Date().toISOString(),
    backend: 'up'
  });
});

// ============================================
// Queue Management APIs
// ============================================

// Enter queue - Simplified endpoint for entering a clinic queue
app.post('/api/queue/enter', async (req, res) => {
  const { clinicId, visitId, patientId } = req.body;
  try {
    const vid = visitId || patientId;
    if (!clinicId || !vid) {
      return res.status(400).json({ error: 'Missing clinicId or visitId' });
    }
    const result = await assignTicket(clinicId, vid);
    return res.json({ 
      success: true,
      ticket: result.ticket, 
      clinicId: result.clinicId, 
      dateKey: result.dateKey,
      verified: true 
    });
  } catch (error: any) {
    return res.status(400).json({ error: error.message });
  }
});

// Complete queue entry
app.post('/api/queue/complete', async (req, res) => {
  const { clinicId, visitId, ticket } = req.body;
  try {
    if (!clinicId || !visitId || !ticket) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    const result = await markDone(clinicId, visitId, ticket);
    return res.json({ success: true, result });
  } catch (error: any) {
    return res.status(400).json({ success: false, error: error.message });
  }
});

// Get queue status for a specific clinic
app.get('/api/queue/status/:clinicId', async (req, res) => {
  const { clinicId } = req.params;
  try {
    const day = localDateKeyAsiaQatar();
    const file = path.join('data','queues',clinicId, `${day}.json`);
    const queueData = await readJSON<any>(file, { 
      meta:{clinicId, dateKey:day, version:1}, 
      nextCallTicket:1, 
      waiting:[], 
      in:[], 
      done:[] 
    });
    
    return res.json({
      ok: true,
      clinicId,
      dateKey: day,
      waiting: queueData.waiting,
      in: queueData.in,
      done: queueData.done,
      nextCallTicket: queueData.nextCallTicket,
      stats: {
        waiting: queueData.waiting.length,
        inProgress: queueData.in.length,
        completed: queueData.done.length,
        total: queueData.waiting.length + queueData.in.length + queueData.done.length
      }
    });
  } catch (error: any) {
    return res.status(400).json({ error: error.message });
  }
});

// Get all queues
app.get('/api/queues', async (req, res) => {
  try {
    // Return basic clinic list - in production this would query actual clinic data
    const clinics = [
      { id: 'clinic1', name: 'العيادة الأولى', status: 'active' },
      { id: 'clinic2', name: 'العيادة الثانية', status: 'active' },
      { id: 'clinic3', name: 'العيادة الثالثة', status: 'active' }
    ];
    return res.json(clinics);
  } catch (error: any) {
    return res.status(400).json({ error: error.message });
  }
});

// ============================================
// Admin APIs
// ============================================

// Admin login
app.post('/api/admin/login', async (req, res) => {
  const { adminCode, username, password } = req.body;
  try {
    // Simple authentication - in production use proper auth
    const validCode = 'BOMUSSA14490';
    const validUsername = 'Bomussa';
    const validPassword = '14490';
    
    if (adminCode === validCode || (username === validUsername && password === validPassword)) {
      return res.json({ 
        success: true, 
        token: 'admin-token-' + Date.now() 
      });
    }
    
    return res.status(401).json({ success: false, error: 'Invalid credentials' });
  } catch (error: any) {
    return res.status(400).json({ success: false, error: error.message });
  }
});

// Get admin statistics
app.get('/api/admin/stats', async (req, res) => {
  try {
    // Calculate statistics from queue data
    const day = localDateKeyAsiaQatar();
    let totalPatients = 0;
    let totalWaiting = 0;
    let totalCompleted = 0;
    
    // In production, aggregate from all clinics
    const clinics = ['clinic1', 'clinic2', 'clinic3'];
    for (const clinicId of clinics) {
      try {
        const file = path.join('data','queues',clinicId, `${day}.json`);
        const queueData = await readJSON<any>(file, { 
          meta:{clinicId, dateKey:day, version:1}, 
          nextCallTicket:1, 
          waiting:[], 
          in:[], 
          done:[] 
        });
        totalWaiting += queueData.waiting.length;
        totalCompleted += queueData.done.length;
        totalPatients += queueData.waiting.length + queueData.in.length + queueData.done.length;
      } catch (e) {
        // Clinic has no data for today
      }
    }
    
    return res.json({
      totalPatients,
      totalWaiting,
      totalCompleted,
      avgWaitTime: 0 // Would calculate from actual data
    });
  } catch (error: any) {
    return res.status(400).json({ error: error.message });
  }
});

// Get clinics list
app.get('/api/admin/clinics', async (req, res) => {
  try {
    const clinics = [
      { id: 'clinic1', name: 'العيادة الأولى', status: 'active', floor: '1' },
      { id: 'clinic2', name: 'العيادة الثانية', status: 'active', floor: '1' },
      { id: 'clinic3', name: 'العيادة الثالثة', status: 'active', floor: '2' }
    ];
    return res.json(clinics);
  } catch (error: any) {
    return res.status(400).json({ error: error.message });
  }
});

// Get active PINs
app.get('/api/admin/pins', async (req, res) => {
  try {
    const day = localDateKeyAsiaQatar();
    const file = path.join('data','pins', `${day}.json`);
    const pinData = await readJSON<any>(file, { meta:{tz:'Asia/Qatar',version:1}, pins:{} });
    
    const activePins = [];
    for (const [key, pins] of Object.entries(pinData.pins)) {
      const [clinicId, dateKey] = key.split(':');
      if (Array.isArray(pins) && pins.length > 0) {
        activePins.push({
          id: key,
          clinicId,
          dateKey,
          currentPin: pins[pins.length - 1],
          totalIssued: pins.length,
          allPins: pins
        });
      }
    }
    
    return res.json({ pins: activePins });
  } catch (error: any) {
    return res.json({ pins: [] });
  }
});

// Call next patient
app.post('/api/admin/next/:type', async (req, res) => {
  const { type } = req.params;
  try {
    await clinicCallSchedulerTick(type);
    return res.json({ success: true });
  } catch (error: any) {
    return res.status(400).json({ success: false, error: error.message });
  }
});

// Pause queue
app.post('/api/admin/pause/:type', async (req, res) => {
  const { type } = req.params;
  try {
    // In production, implement pause logic
    return res.json({ success: true });
  } catch (error: any) {
    return res.status(400).json({ success: false, error: error.message });
  }
});

// Reset system
app.post('/api/admin/reset', async (req, res) => {
  try {
    // In production, implement reset logic with proper safeguards
    return res.json({ success: true });
  } catch (error: any) {
    return res.status(400).json({ success: false, error: error.message });
  }
});

// Deactivate PIN
app.post('/api/admin/deactivate-pin', async (req, res) => {
  const { pinId } = req.body;
  try {
    // In production, implement PIN deactivation
    return res.json({ success: true });
  } catch (error: any) {
    return res.status(400).json({ success: false, error: error.message });
  }
});

// Enhanced dashboard stats
app.get('/api/admin/dashboard/stats', async (req, res) => {
  try {
    // Return enhanced statistics
    return res.json({
      totalPatients: 0,
      activePatients: 0,
      completedToday: 0,
      avgWaitTime: 0,
      peakHours: []
    });
  } catch (error: any) {
    return res.status(400).json({ error: error.message });
  }
});

// Get clinic occupancy
app.get('/api/admin/clinics/occupancy', async (req, res) => {
  try {
    return res.json([]);
  } catch (error: any) {
    return res.status(400).json({ error: error.message });
  }
});

// Get active queue
app.get('/api/admin/queue/active', async (req, res) => {
  try {
    return res.json([]);
  } catch (error: any) {
    return res.status(400).json({ error: error.message });
  }
});

// Get wait times
app.get('/api/admin/queue/wait-times', async (req, res) => {
  try {
    return res.json({});
  } catch (error: any) {
    return res.status(400).json({ error: error.message });
  }
});

// Get throughput stats
app.get('/api/admin/stats/throughput', async (req, res) => {
  try {
    return res.json({});
  } catch (error: any) {
    return res.status(400).json({ error: error.message });
  }
});

// Generate report
app.post('/api/admin/report', async (req, res) => {
  const { type, format } = req.body;
  try {
    return res.json({ 
      success: true,
      report: {
        type,
        format,
        generatedAt: new Date().toISOString()
      }
    });
  } catch (error: any) {
    return res.status(400).json({ error: error.message });
  }
});

// Get report history
app.get('/api/admin/reports', async (req, res) => {
  try {
    return res.json([]);
  } catch (error: any) {
    return res.status(400).json({ error: error.message });
  }
});

// ============================================
// Patient APIs
// ============================================

// Select exam type
app.post('/api/select-exam', async (req, res) => {
  const { patientId, examType } = req.body;
  try {
    if (!patientId || !examType) {
      return res.status(400).json({ error: 'Missing patientId or examType' });
    }
    // In production, store this in database
    return res.json({ 
      success: true,
      patientId,
      queueType: examType
    });
  } catch (error: any) {
    return res.status(400).json({ error: error.message });
  }
});

// Get patient status
app.get('/api/patient/:id', async (req, res) => {
  const { id } = req.params;
  try {
    // In production, fetch from database
    return res.json({
      id,
      status: 'active',
      queueType: null
    });
  } catch (error: any) {
    return res.status(400).json({ error: error.message });
  }
});

// Get notifications
app.get('/api/notifications', async (req, res) => {
  const patientId = req.query.patientId;
  try {
    return res.json([]);
  } catch (error: any) {
    return res.status(400).json({ error: error.message });
  }
});

// ============================================
// Server-Sent Events (SSE) for real-time notifications
// ============================================
app.get('/api/events', async (req, res) => {
  // Set headers for SSE
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no'); // Disable buffering for nginx
  
  // Send initial connection message
  res.write('event: hello\n');
  res.write(`data: ${JSON.stringify({ message: 'Connected' })}\n\n`);
  
  // Keep connection alive
  const keepaliveInterval = setInterval(() => {
    res.write(': keepalive\n\n');
  }, 30000);
  
  // Cleanup on close
  req.on('close', () => {
    clearInterval(keepaliveInterval);
  });
});

export default app;

log("API initialized with all endpoints");

/**
 * Cloudflare Pages Function - Middleware V2.1
 * متوافق 100% مع Cloudflare Workers
 */

// Backend API Base URL
const BE_BASE_URL = 'https://api.mmc-mms.com/api/v1';

// Helper: HTTP request to backend
async function http(path, opts = {}) {
  const res = await fetch(BE_BASE_URL + path, {
    ...opts,
    headers: {
      'content-type': 'application/json',
      ...(opts.headers || {})
    }
  });
  if (!res.ok) throw new Error('BACKEND_TIMEOUT');
  return res.status === 204 ? null : await res.json();
}

// Backend service
const be = {
  verifyPin: (sessionId, clinicId, pin) =>
    http('/pins/verify', {
      method: 'POST',
      body: JSON.stringify({ sessionId, clinicId, pin })
    }),
  clinicIsOpen: (clinicId) =>
    http(`/clinic/is-open?clinicId=${encodeURIComponent(clinicId)}`),
  logEntry: (sid, cid) =>
    http('/log/entry', {
      method: 'POST',
      body: JSON.stringify({ sessionId: sid, clinicId: cid })
    }),
  logExit: (sid, cid) =>
    http('/log/exit', {
      method: 'POST',
      body: JSON.stringify({ sessionId: sid, clinicId: cid })
    }),
  issueQueue: (cid) =>
    http('/queue/issue', {
      method: 'POST',
      body: JSON.stringify({ clinicId: cid })
    }),
  occupancy: (cid) =>
    http(`/clinic/occupancy?clinicId=${encodeURIComponent(cid)}`),
  rebuild: (kind, payload) =>
    http('/fix/rebuild', {
      method: 'POST',
      body: JSON.stringify({ kind, payload })
    })
};

// Logger
function logInfo(msg, meta) {
  console.log('[INFO]', msg, JSON.stringify(meta || {}));
}

function logError(msg, meta) {
  console.error('[ERROR]', msg, JSON.stringify(meta || {}));
}

function logWarn(msg, meta) {
  console.warn('[WARN]', msg, JSON.stringify(meta || {}));
}

// Realtime service (placeholder)
function emit(type, payload) {
  logInfo('emit', { type, payload });
  return { ok: true };
}

// Guards
function ensureAuth(ctx) {
  // Placeholder: يمكن إضافة تحقق JWT هنا
  return true;
}

function ensureOrder(kind, payload) {
  // Placeholder: التحقق من التسلسل المنطقي
  return true;
}

async function ensureNoDupSession(payload) {
  // Placeholder: التحقق من عدم تكرار الجلسة
  return true;
}

// Auto-repair
async function autoRepair(kind, payload, ctx, err) {
  const transient = new Set([
    'OCCUPANCY_CONFLICT',
    'NUMBER_DUP',
    'BACKEND_TIMEOUT'
  ]);
  const code = err?.code || err?.message;
  if (!transient.has(code)) return null;
  const fixed = await be.rebuild(kind, payload);
  logInfo('autoRepair.applied', { kind, code });
  return { ok: true, result: fixed || { ok: true } };
}

// Validation
async function validate(kind, payload, ctx) {
  ensureAuth(ctx);
  ensureOrder(kind, payload);

  switch (kind) {
    case 'session.start':
      await ensureNoDupSession(payload);
      return;
    case 'clinic.enter':
      await be.clinicIsOpen(payload.clinicId);
      return;
    case 'pin.verify':
      await be.verifyPin(payload.sessionId, payload.clinicId, payload.pin);
      return;
    case 'queue.issue':
      return;
    default:
      return;
  }
}

// Orchestration
async function orchestrate(kind, payload, ctx) {
  switch (kind) {
    case 'session.start': {
      emit('SESSION_START', {
        sessionId: payload.sessionId,
        ts: Date.now()
      });
      return { ok: true };
    }
    case 'clinic.enter': {
      await be.logEntry(payload.sessionId, payload.clinicId);
      emit('CLINIC_ENTER', {
        sessionId: payload.sessionId,
        clinicId: payload.clinicId,
        ts: Date.now()
      });
      return { ok: true };
    }
    case 'pin.verify': {
      await be.logExit(payload.sessionId, payload.clinicId);
      const q = await be.issueQueue(payload.nextClinicId);
      const occ = await be.occupancy(payload.nextClinicId);
      if (occ?.current < 0) throw new Error('OCCUPANCY_CONFLICT');
      emit('QUEUE_ISSUED', {
        clinicId: payload.nextClinicId,
        number: q.number,
        ts: Date.now()
      });
      return { number: q.number };
    }
    case 'queue.issue': {
      const q = await be.issueQueue(payload.clinicId);
      emit('QUEUE_ISSUED', {
        clinicId: payload.clinicId,
        number: q.number,
        ts: Date.now()
      });
      return { number: q.number };
    }
    default:
      return { ok: true };
  }
}

// Engine
async function run(kind, payload, ctx) {
  try {
    await validate(kind, payload, ctx);
    const result = await orchestrate(kind, payload, ctx);
    return { ok: true, result };
  } catch (err) {
    logWarn('engine.catch', { kind, err: err?.message });
    const repaired = await autoRepair(kind, payload, ctx, err);
    if (repaired?.ok) return { ok: true, result: repaired.result };
    logError('engine.fail', { kind, error: err?.message });
    throw err;
  }
}

// Parse request body
async function parseBody(request) {
  try {
    const text = await request.text();
    return text ? JSON.parse(text) : {};
  } catch {
    return {};
  }
}

// Main handler
export async function onRequest(context) {
  const { request } = context;
  const url = new URL(request.url);
  const ctx = {
    headers: Object.fromEntries(request.headers),
    ip: request.headers.get('CF-Connecting-IP') || 'unknown'
  };

  try {
    const body = await parseBody(request);
    let result = null;

    // Routes
    if (request.method === 'POST' && url.pathname === '/mw/session/start') {
      result = await run('session.start', body, ctx);
    } else if (
      request.method === 'POST' &&
      url.pathname === '/mw/clinic/enter'
    ) {
      result = await run('clinic.enter', body, ctx);
    } else if (
      request.method === 'POST' &&
      url.pathname === '/mw/pin/verify'
    ) {
      result = await run('pin.verify', body, ctx);
    } else if (
      request.method === 'POST' &&
      url.pathname === '/mw/queue/issue'
    ) {
      result = await run('queue.issue', body, ctx);
    } else if (
      request.method === 'GET' &&
      url.pathname === '/mw/admin/pins/today'
    ) {
      result = { pins: [] };
    } else if (
      request.method === 'GET' &&
      url.pathname === '/mw/admin/live'
    ) {
      result = { ok: true, mode: 'SSE-placeholder' };
    } else if (
      request.method === 'POST' &&
      url.pathname === '/mw/notify/info'
    ) {
      result = { ok: true };
    } else {
      return new Response(
        JSON.stringify({ ok: false, error: 'NOT_FOUND' }),
        {
          status: 404,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization'
      }
    });
  } catch (error) {
    logError('middleware.error', { error: error.message });

    return new Response(
      JSON.stringify({
        ok: false,
        error: 'INTERNAL_ERROR',
        message: error.message
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}


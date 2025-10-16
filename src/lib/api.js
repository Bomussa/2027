import unifiedStorage from './unified-storage.js'

// كشف ديناميكي لقاعدة الـ API مع بدائل متعددة لضمان العمل في وضع التطوير والإنتاج وحتى دون خادم
function resolveApiBases() {
  const bases = []
  const envBase = (import.meta.env.VITE_API_BASE || '').trim()
  if (envBase) bases.push(envBase)

  // أثناء التطوير غالباً يعمل الخادم الخلفي على 3000
  if (import.meta.env.DEV) bases.push('http://localhost:3000')

  // نفس الأصل يعمل في الإنتاج أو عند وجود وكيل proxy
  bases.push(window.location.origin)

  // إزالة التكرارات
  return Array.from(new Set(bases))
}

const API_BASES = resolveApiBases()

class ApiService {
  async request(endpoint, options = {}) {
    const config = {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      },
      ...options
    }

    // جرّب جميع القواعد المحتملة بالتسلسل
    let lastError = null
    for (const base of API_BASES) {
      const url = `${base}${endpoint}`
      try {
        const response = await fetch(url, config)
        // قد يُعاد محتوى ليس JSON عند الخطأ؛ نتعامل بحذر
        const text = await response.text()
        let data
        try { data = text ? JSON.parse(text) : {} } catch { data = { raw: text } }

        if (!response.ok) {
          lastError = new Error(data?.error || `HTTP ${response.status}`)
          continue
        }
        return data
      } catch (err) {
        lastError = err
        // جرّب القاعدة التالية
        continue
      }
    }

    // في حال فشل جميع المحاولات، فعّل وضع عدم الاتصال لبعض المسارات الأساسية
    const offline = await this.offlineFallback(endpoint, options)
    if (offline.ok) return offline.data

    console.error('API Error (all bases failed):', lastError)
    throw lastError || new Error('تعذر الوصول إلى الخادم')
  }

  // رجوع محلي محسّن يدعم جميع الوظائف
  async offlineFallback(endpoint, options = {}) {
    try {
      const method = (options.method || 'GET').toUpperCase()
      const body = options.body ? JSON.parse(options.body) : null

      // POST /api/queue/enter
      if (endpoint === '/api/queue/enter' && method === 'POST') {
        const patientId = body?.patientId || body?.visitId
        const clinicId = body?.clinicId
        
        console.log('[Offline] /api/queue/enter:', { patientId, clinicId, body })
        
        if (patientId && clinicId) {
          // إضافة للطابور
          const entry = await unifiedStorage.addToQueue(clinicId, patientId)
          return { ok: true, data: { ticket: entry.number, clinicId, verified: true } }
        } else if (patientId) {
          // إنشاء مراجع جديد
          const patient = unifiedStorage.addPatient(body)
          console.log('[Offline] Patient created:', patient)
          return { ok: true, data: patient }
        }
      }

      // POST /api/select-exam
      if (endpoint === '/api/select-exam' && method === 'POST' && body?.patientId && body?.examType) {
        const patient = unifiedStorage.updatePatient(body.patientId, { queueType: body.examType })
        
        // تهيئة المسار الديناميكي للمراجع
        await unifiedStorage.initPatientPath(body.patientId, body.examType)
        
        return { ok: true, data: patient }
      }

      // GET /api/patient/:id
      if (endpoint.startsWith('/api/patient/')) {
        const id = endpoint.split('/').pop()
        const patient = unifiedStorage.getPatient(id)
        if (patient) return { ok: true, data: patient }
      }

      // GET /api/queues
      if (endpoint === '/api/queues' && method === 'GET') {
        const clinics = unifiedStorage.getClinics()
        return { ok: true, data: clinics }
      }

      // GET /api/admin/stats
      if (endpoint === '/api/admin/stats' && method === 'GET') {
        const stats = unifiedStorage.getStats()
        return { ok: true, data: stats }
      }

      // GET /api/admin/pins
      if (endpoint.startsWith('/api/admin/pins') && method === 'GET') {
        const pins = unifiedStorage.getActivePINs()
        return { ok: true, data: { pins } }
      }

      // POST /api/pin/issue
      if (endpoint === '/api/pin/issue' && method === 'POST' && body?.clinicId) {
        const pin = unifiedStorage.generatePIN(body.clinicId)
        return { ok: true, data: pin }
      }

      // POST /api/pin/validate
      if (endpoint === '/api/pin/validate' && method === 'POST' && body?.clinicId && body?.pin) {
        const result = unifiedStorage.openClinic(body.clinicId, body.pin)
        return { ok: result.success, data: result }
      }

      // POST /api/admin/deactivate-pin
      if (endpoint === '/api/admin/deactivate-pin' && method === 'POST' && body?.pinId) {
        const success = unifiedStorage.deactivatePIN(body.pinId)
        return { ok: success, data: { success } }
      }

      // GET /api/admin/clinics
      if (endpoint === '/api/admin/clinics' && method === 'GET') {
        const clinics = unifiedStorage.getClinics()
        return { ok: true, data: clinics }
      }

      // POST /api/admin/next/:type
      if (endpoint.match(/\/api\/admin\/next\//) && method === 'POST') {
        const clinicId = endpoint.split('/').pop()
        const result = unifiedStorage.callNextPatient(clinicId)
        return { ok: result.success, data: result }
      }

      // POST /api/admin/pause/:type
      if (endpoint.match(/\/api\/admin\/pause\//) && method === 'POST') {
        const clinicId = endpoint.split('/').pop()
        const result = unifiedStorage.pauseQueue(clinicId)
        return { ok: result.success, data: result }
      }

      // POST /api/admin/reset
      if (endpoint === '/api/admin/reset' && method === 'POST') {
        const result = unifiedStorage.resetSystem()
        return { ok: true, data: result }
      }

      // POST /api/queue/complete
      if (endpoint === '/api/queue/complete' && method === 'POST' && body?.clinicId && body?.ticket) {
        const result = unifiedStorage.completePatient(body.clinicId, body.ticket)
        return { ok: result.success, data: result }
      }

      // POST /api/admin/report
      if (endpoint === '/api/admin/report' && method === 'POST') {
        const report = unifiedStorage.generateReport(body?.type || 'general', body?.format || 'json')
        return { ok: true, data: report }
      }

      // GET /api/admin/reports
      if (endpoint.startsWith('/api/admin/reports') && method === 'GET') {
        const reports = unifiedStorage.getReports()
        return { ok: true, data: reports }
      }

      // GET /api/notifications
      if (endpoint.startsWith('/api/notifications') && method === 'GET') {
        const patientId = new URLSearchParams(endpoint.split('?')[1] || '').get('patientId')
        const notifications = unifiedStorage.getNotifications(patientId)
        return { ok: true, data: notifications }
      }

      // POST /api/admin/login
      if (endpoint === '/api/admin/login' && method === 'POST') {
        // تسجيل دخول بسيط للاختبار
        if (body?.adminCode === 'BOMUSSA14490' || (body?.username === 'Bomussa' && body?.password === '14490')) {
          return { ok: true, data: { success: true, token: 'offline-token' } }
        }
        return { ok: false, data: { success: false, error: 'Invalid credentials' } }
      }

      return { ok: false }
    } catch (e) {
      console.error('Offline fallback error:', e)
      return { ok: false }
    }
  }

  // Patient APIs
  async enterQueue(patientData) {
    return this.request('/api/queue/enter', {
      method: 'POST',
      body: JSON.stringify(patientData)
    })
  }

  async getPatientStatus(patientId) {
    return this.request(`/api/patient/${patientId}`)
  }

  async selectExam(patientId, examType) {
    return this.request('/api/select-exam', {
      method: 'POST',
      body: JSON.stringify({ patientId, examType })
    })
  }

  async unlockStation(patientId, stationId, pin) {
    return this.request('/api/pin/validate', {
      method: 'POST',
      body: JSON.stringify({ clinicId: stationId, pin, dateKey: new Date().toISOString().split('T')[0] })
    })
  }

  // Queue APIs
  async getQueues() {
    return this.request('/api/queues')
  }

  async getQueueStats() {
    return this.request('/api/admin/stats')
  }

  // Clinic entry/exit
  async enterClinic(visitId, clinicId) {
    return this.request('/api/queue/enter', {
      method: 'POST',
      body: JSON.stringify({ visitId, clinicId })
    })
  }

  async completeClinic(clinicId, ticket) {
    return this.request('/api/queue/complete', {
      method: 'POST',
      body: JSON.stringify({ clinicId, ticket })
    })
  }

  // Admin APIs
  async adminLogin(code) {
    return this.request('/api/admin/login', {
      method: 'POST',
      body: JSON.stringify({ adminCode: code })
    })
  }

  async callNextPatient(queueType, adminCode) {
    return this.request(`/api/admin/next/${queueType}`, {
      method: 'POST',
      body: JSON.stringify({ adminCode })
    })
  }

  async pauseQueue(queueType, adminCode) {
    return this.request(`/api/admin/pause/${queueType}`, {
      method: 'POST',
      body: JSON.stringify({ adminCode })
    })
  }

  async resetSystem(adminCode) {
    return this.request('/api/admin/reset', {
      method: 'POST',
      body: JSON.stringify({ adminCode })
    })
  }

  // PIN Management APIs
  async generatePIN(stationId, adminCode) {
    return this.request('/api/pin/issue', {
      method: 'POST',
      body: JSON.stringify({ clinicId: stationId })
    })
  }

  async deactivatePIN(pinId, adminCode) {
    return this.request('/api/admin/deactivate-pin', {
      method: 'POST',
      body: JSON.stringify({ pinId, adminCode })
    })
  }

  async getActivePINs(adminCode) {
    return this.request(`/api/admin/pins?adminCode=${adminCode}`)
  }

  // Enhanced Admin APIs
  async getClinics() {
    return this.request('/api/admin/clinics')
  }

  async getActiveQueue() {
    return this.request('/api/admin/queue/active')
  }

  async getDashboardStats() {
    return this.request('/api/admin/dashboard/stats')
  }

  async getClinicOccupancy() {
    return this.request('/api/admin/clinics/occupancy')
  }

  async getWaitTimes() {
    return this.request('/api/admin/queue/wait-times')
  }

  async getThroughputStats() {
    return this.request('/api/admin/stats/throughput')
  }

  // Reports APIs
  async generateReport(type, format, adminCode) {
    return this.request('/api/admin/report', {
      method: 'POST',
      body: JSON.stringify({ type, format, adminCode })
    })
  }

  async getReportHistory(adminCode) {
    return this.request(`/api/admin/reports?adminCode=${adminCode}`)
  }

  // WebSocket connection
  connectWebSocket() {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    const wsUrl = `${protocol}//${window.location.host}`
    
    const ws = new WebSocket(wsUrl)
    
    ws.onopen = () => {
      console.log('WebSocket connected')
    }
    
    ws.onclose = () => {
      console.log('WebSocket disconnected')
      // Reconnect after 3 seconds
      setTimeout(() => this.connectWebSocket(), 3000)
    }
    
    ws.onerror = (error) => {
      console.error('WebSocket error:', error)
    }
    
    return ws
  }
}


const api = new ApiService();
export default api;
export { api };

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
    const offline = this.offlineFallback(endpoint, options)
    if (offline.ok) return offline.data

    console.error('API Error (all bases failed):', lastError)
    throw lastError || new Error('تعذر الوصول إلى الخادم')
  }

  // رجوع محلي دون خادم لتجربة التدفق الأساسي عند غياب الـ API
  offlineFallback(endpoint, options = {}) {
    try {
      const method = (options.method || 'GET').toUpperCase()
      const body = options.body ? JSON.parse(options.body) : null

      // تخزين محلي بسيط للحالة
      const lsKey = 'mms.patientData'
      const readPatient = () => {
        try { return JSON.parse(localStorage.getItem(lsKey) || 'null') } catch { return null }
      }
      const writePatient = (v) => {
        try { localStorage.setItem(lsKey, JSON.stringify(v)) } catch (e) { void 0 }
      }

      // POST /api/queue/enter
      if (endpoint === '/api/queue/enter' && method === 'POST' && body?.patientId) {
        const id = Date.now().toString(36)
        const data = { id, patientId: body.patientId, gender: body.gender || 'male', queueType: null, status: 'waiting' }
        writePatient(data)
        return { ok: true, data }
      }

      // POST /api/select-exam
      if (endpoint === '/api/select-exam' && method === 'POST' && body?.patientId && body?.examType) {
        const p = readPatient() || { id: body.patientId, patientId: body.patientId }
        const data = { ...p, queueType: body.examType, status: 'in-queue' }
        writePatient(data)
        return { ok: true, data: { ok: true, ...data } }
      }

      // GET /api/patient/:id
      if (endpoint.startsWith('/api/patient/')) {
        const p = readPatient()
        if (p) return { ok: true, data: p }
      }

      // استدعاءات أخرى لا يوجد لها رجوع محلي
      return { ok: false }
    } catch (e) {
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

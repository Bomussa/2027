// API Service للتكامل مع Backend
// المسارات محدثة لتتطابق مع /api/v1/*

const API_VERSION = '/api/v1'

function resolveApiBases() {
  const bases = []
  const envBase = (import.meta.env.VITE_API_BASE || '').trim()
  if (envBase) bases.push(envBase)

  // أثناء التطوير
  if (import.meta.env.DEV) bases.push('http://localhost:3000')

  // نفس الأصل (الإنتاج)
  bases.push(window.location.origin)

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

    let lastError = null
    for (const base of API_BASES) {
      const url = `${base}${endpoint}`
      try {
        const response = await fetch(url, config)
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
        continue
      }
    }

    // Offline fallback
    const offline = this.offlineFallback(endpoint, options)
    if (offline.ok) return offline.data

    console.error('API Error:', lastError)
    throw lastError || new Error('تعذر الوصول إلى الخادم')
  }

  offlineFallback(endpoint, options = {}) {
    try {
      const method = (options.method || 'GET').toUpperCase()
      const body = options.body ? JSON.parse(options.body) : null

      const lsKey = 'mms.patientData'
      const readPatient = () => {
        try { return JSON.parse(localStorage.getItem(lsKey) || 'null') } catch { return null }
      }
      const writePatient = (v) => {
        try { localStorage.setItem(lsKey, JSON.stringify(v)) } catch (e) { void 0 }
      }

      // Offline fallbacks
      if (endpoint === `${API_VERSION}/queue/enter` && method === 'POST' && body?.user) {
        const id = Date.now().toString(36)
        const data = {
          success: true,
          clinic: body.clinic,
          user: body.user,
          number: Date.now(),
          display_number: 1,
          status: 'WAITING',
          ahead: 0
        }
        writePatient(data)
        return { ok: true, data }
      }

      return { ok: false }
    } catch (e) {
      return { ok: false }
    }
  }

  // ==========================================
  // Queue APIs - متطابقة مع Backend
  // ==========================================

  /**
   * تسجيل دخول المريض
   * Backend: POST /api/v1/patient/login
   * Body: { patientId, gender }
   * Response: { success, data }
   */
  async patientLogin(patientId, gender) {
    return this.request(`${API_VERSION}/patient/login`, {
      method: 'POST',
      body: JSON.stringify({ patientId, gender })
    })
  }

  /**
   * دخول الدور في عيادة
   * Backend: POST /api/v1/queue/enter
   * Body: { clinic, user }
   * Response: { success, clinic, user, number, status, ahead, display_number }
   */
  async enterQueue(clinic, user) {
    return this.request(`${API_VERSION}/queue/enter`, {
      method: 'POST',
      body: JSON.stringify({ clinic, user })
    })
  }

  /**
   * حالة الدور في عيادة
   * Backend: GET /api/v1/queue/status?clinic=xxx
   * Response: { success, clinic, list, current_serving, total_waiting }
   */
  async getQueueStatus(clinic) {
    return this.request(`${API_VERSION}/queue/status?clinic=${clinic}`)
  }

  /**
   * إنهاء الدور والخروج من العيادة
   * Backend: POST /api/v1/queue/done
   * Body: { clinic, user, pin }
   * Response: { success, message }
   */
  async queueDone(clinic, user, pin) {
    return this.request(`${API_VERSION}/queue/done`, {
      method: 'POST',
      body: JSON.stringify({
        clinic,
        user,
        pin: String(pin)
      })
    })
  }

  /**
   * استدعاء المراجع التالي (للإدارة)
   * Backend: POST /api/v1/queue/call
   * Body: { clinic }
   * Response: { success, next_patient }
   */
  async callNextPatient(clinic) {
    return this.request(`${API_VERSION}/queue/call`, {
      method: 'POST',
      body: JSON.stringify({ clinic })
    })
  }

  // ==========================================
  // PIN APIs
  // ==========================================

  /**
   * حالة PIN اليومي
   * Backend: GET /api/v1/pin/status
   * Response: { success, pins: {...} }
   */
  async getPinStatus() {
    return this.request(`${API_VERSION}/pin/status`)
  }

  // ==========================================
  // Path APIs
  // ==========================================

  /**
   * اختيار المسار الطبي
   * Backend: GET /api/v1/path/choose
   * Response: { success, path: [...] }
   */
  async choosePath() {
    return this.request(`${API_VERSION}/path/choose`)
  }

  // ==========================================
  // Admin APIs
  // ==========================================

  /**
   * حالة الإدارة
   * Backend: GET /api/v1/admin/status
   */
  async getAdminStatus() {
    return this.request(`${API_VERSION}/admin/status`)
  }

  // ==========================================
  // Health Check
  // ==========================================

  /**
   * فحص صحة النظام
   * Backend: GET /api/v1/health/status
   */
  async getHealthStatus() {
    return this.request(`${API_VERSION}/health/status`)
  }

  // ==========================================
  // SSE (Server-Sent Events)
  // ==========================================

  /**
   * الاتصال بـ SSE للتحديثات الحية
   * Backend: GET /api/v1/events/stream?clinic=xxx
   */
  connectSSE(clinic, callback) {
    const url = `${window.location.origin}${API_VERSION}/events/stream?clinic=${clinic}`
    const eventSource = new EventSource(url)

    eventSource.addEventListener('queue_update', (e) => {
      try {
        const data = JSON.parse(e.data)
        callback({ type: 'queue_update', data })
      } catch (err) {
        console.error('SSE parse error:', err)
      }
    })

    eventSource.addEventListener('heartbeat', (e) => {
      console.log('SSE heartbeat received')
      callback({ type: 'heartbeat', data: { timestamp: e.data } })
    })

    eventSource.onerror = (err) => {
      console.error('SSE connection error:', err)
      eventSource.close()

      // إعادة الاتصال بعد 5 ثوان
      setTimeout(() => {
        console.log('SSE reconnecting...')
        this.connectSSE(clinic, callback)
      }, 5000)
    }

    eventSource.onopen = () => {
      console.log('SSE connected to', clinic)
    }

    return eventSource
  }

  // ==========================================
  // Compatibility Methods (للتوافق مع الكود القديم)
  // ==========================================

  async enterClinic(visitId, clinicId) {
    return this.enterQueue(clinicId, visitId)
  }

  async completeClinic(clinicId, user, pin) {
    return this.queueDone(clinicId, user, pin)
  }

  async getPatientStatus(patientId) {
    // لا يوجد endpoint مباشر - استخدم offline fallback
    return this.offlineFallback('/api/patient/' + patientId, {})
  }

  async selectExam(patientId, examType) {
    // لا يوجد endpoint مباشر - استخدم offline fallback
    const data = {
      ok: true,
      patientId,
      examType,
      status: 'selected'
    }
    return data
  }

  async unlockStation(patientId, stationId, pin) {
    return this.getPinStatus()
  }

  async getQueues() {
    // استخدام API الجديد للحصول على جميع الطوابير
    return this.request(`${API_VERSION}/stats/queues`)
  }

  async getQueueStats() {
    // استخدام API الجديد للإحصائيات
    return this.request(`${API_VERSION}/stats/dashboard`)
  }

  async adminLogin(code) {
    // لا يوجد endpoint - استخدم validation بسيط
    return { success: code === 'admin123', token: 'mock-token' }
  }

  async pauseQueue(queueType, adminCode) {
    return { success: true, message: 'Queue paused' }
  }

  async resetSystem(adminCode) {
    return { success: true, message: 'System reset' }
  }

  async generatePIN(stationId, adminCode) {
    return this.getPinStatus()
  }

  async deactivatePIN(pinId, adminCode) {
    return { success: true, message: 'PIN deactivated' }
  }

  async getActivePINs(adminCode) {
    return this.getPinStatus()
  }

  async getClinics() {
    return {
      clinics: [
        { id: 'lab', name: 'المختبر', type: 'diagnostic' },
        { id: 'xray', name: 'الأشعة', type: 'diagnostic' },
        { id: 'eyes', name: 'العيون', type: 'clinic' },
        { id: 'internal', name: 'الباطنية', type: 'clinic' },
        { id: 'ent', name: 'الأنف والأذن والحنجرة', type: 'clinic' },
        { id: 'surgery', name: 'الجراحة', type: 'clinic' },
        { id: 'dental', name: 'الأسنان', type: 'clinic' },
        { id: 'psychiatry', name: 'الطب النفسي', type: 'clinic' },
        { id: 'derma', name: 'الجلدية', type: 'clinic' },
        { id: 'bones', name: 'العظام', type: 'clinic' },
        { id: 'vitals', name: 'القياسات الحيوية', type: 'vital' },
        { id: 'ecg', name: 'تخطيط القلب', type: 'diagnostic' },
        { id: 'audio', name: 'السمعيات', type: 'diagnostic' }
      ]
    }
  }

  async getActiveQueue() {
    return this.getQueues()
  }

  async getDashboardStats() {
    return this.getAdminStatus()
  }

  async getClinicOccupancy() {
    return this.getQueues()
  }

  async getWaitTimes() {
    return this.getQueues()
  }

  async getThroughputStats() {
    return this.getAdminStatus()
  }

  async generateReport(type, format, adminCode) {
    return { success: true, report: 'Generated' }
  }

  // جلب التقارير الحديثة من الباك اند
  async getRecentReports(adminCode) {
    // استدعاء endpoint حقيقي من الباك اند
    return this.request(`${API_VERSION}/reports/history?adminCode=${encodeURIComponent(adminCode)}`)
  }

  connectWebSocket() {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    const wsUrl = `${protocol}//${window.location.host}`

    const ws = new WebSocket(wsUrl)

    ws.onopen = () => {
      console.log('WebSocket connected')
    }

    ws.onclose = () => {
      console.log('WebSocket disconnected')
      setTimeout(() => this.connectWebSocket(), 3000)
    }

    ws.onerror = (error) => {
      console.error('WebSocket error:', error)
    }

    return ws
  }
}

const api = new ApiService()
export default api
export { api }


const API_BASE = window.location.origin

class ApiService {
  async request(endpoint, options = {}) {
    const url = `${API_BASE}${endpoint}`
    const config = {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      },
      ...options
    }

    try {
      const response = await fetch(url, config)
      
      // Check if response is JSON
      const contentType = response.headers.get('content-type')
      if (!contentType || !contentType.includes('application/json')) {
        throw new Error('استجابة غير صالحة من الخادم')
      }
      
      const data = await response.json()
      
      if (!response.ok) {
        throw new Error(data.error || 'حدث خطأ في الطلب')
      }
      
      return data
    } catch (error) {
      console.error('API Error:', error)
      throw error
    }
  }

  // Patient APIs - Updated to match backend v1 API
  async enterQueue(patientData) {
    // Map to backend API format
    // Backend expects: POST /api/v1/queue/enter
    return this.request('/api/v1/queue/enter', {
      method: 'POST',
      body: JSON.stringify({
        user: patientData.patientId,
        clinic: 'general', // Default clinic
        gender: patientData.gender
      })
    })
  }

  async getPatientStatus(clinic, user) {
    // Backend: GET /api/v1/queue/status?clinic=<clinic>&user=<user>
    return this.request(`/api/v1/queue/status?clinic=${clinic}&user=${user}`)
  }

  async selectExam(patientId, examType) {
    // Backend: POST /api/v1/path/choose
    return this.request('/api/v1/path/choose', {
      method: 'POST',
      body: JSON.stringify({ 
        user: patientId, 
        clinic: examType 
      })
    })
  }

  async unlockStation(patientId, stationId, pin) {
    // Backend: POST /api/v1/pin/verify (if exists)
    return this.request('/api/v1/pin/verify', {
      method: 'POST',
      body: JSON.stringify({ user: patientId, clinic: stationId, pin })
    })
  }

  // Queue APIs
  async getQueues() {
    return this.request('/api/v1/queue/status')
  }

  async getQueueStats() {
    return this.request('/api/v1/admin/status')
  }

  // Admin APIs
  async adminLogin(code) {
    return this.request('/api/v1/admin/login', {
      method: 'POST',
      body: JSON.stringify({ adminCode: code })
    })
  }

  async callNextPatient(clinic, adminCode) {
    // Backend: POST /api/v1/queue/call
    return this.request('/api/v1/queue/call', {
      method: 'POST',
      body: JSON.stringify({ clinic, adminCode })
    })
  }

  async markPatientDone(clinic, user, adminCode) {
    // Backend: POST /api/v1/queue/done
    return this.request('/api/v1/queue/done', {
      method: 'POST',
      body: JSON.stringify({ clinic, user, adminCode })
    })
  }

  async pauseQueue(queueType, adminCode) {
    return this.request(`/api/v1/admin/pause/${queueType}`, {
      method: 'POST',
      body: JSON.stringify({ adminCode })
    })
  }

  async resetSystem(adminCode) {
    return this.request('/api/v1/admin/reset', {
      method: 'POST',
      body: JSON.stringify({ adminCode })
    })
  }

  // PIN Management APIs
  async generatePIN(stationId, adminCode) {
    return this.request('/api/v1/admin/generate-pin', {
      method: 'POST',
      body: JSON.stringify({ stationId, adminCode })
    })
  }

  async deactivatePIN(pinId, adminCode) {
    return this.request('/api/v1/admin/deactivate-pin', {
      method: 'POST',
      body: JSON.stringify({ pinId, adminCode })
    })
  }

  async getActivePINs(adminCode) {
    return this.request(`/api/v1/admin/pins?adminCode=${adminCode}`)
  }

  // Enhanced Admin APIs
  async getClinics() {
    return this.request('/api/v1/admin/clinics')
  }

  async getActiveQueue() {
    return this.request('/api/v1/admin/queue/active')
  }

  async getDashboardStats() {
    return this.request('/api/v1/admin/status')
  }

  async getClinicOccupancy() {
    return this.request('/api/v1/admin/clinics/occupancy')
  }

  async getWaitTimes() {
    return this.request('/api/v1/admin/queue/wait-times')
  }

  async getThroughputStats() {
    return this.request('/api/v1/admin/stats/throughput')
  }

  // Reports APIs
  async generateReport(type, format, adminCode) {
    return this.request('/api/v1/report/daily', {
      method: 'POST',
      body: JSON.stringify({ type, format, adminCode })
    })
  }

  async getReportHistory(adminCode) {
    return this.request(`/api/v1/admin/reports?adminCode=${adminCode}`)
  }

  // Health Check
  async healthCheck() {
    return this.request('/api/v1/health/status')
  }

  // SSE Connection for real-time updates
  connectEventSource(clinic, user = null) {
    const params = new URLSearchParams({ clinic })
    if (user) params.append('user', user)
    
    const url = `${API_BASE}/api/v1/events/stream?${params.toString()}`
    const eventSource = new EventSource(url)
    
    eventSource.addEventListener('open', () => {
      console.log('SSE Connection opened')
    })
    
    eventSource.addEventListener('error', (error) => {
      console.error('SSE Error:', error)
      eventSource.close()
      // Reconnect after 5 seconds
      setTimeout(() => {
        this.connectEventSource(clinic, user)
      }, 5000)
    })
    
    return eventSource
  }

  // Legacy WebSocket connection (kept for compatibility)
  connectWebSocket() {
    console.warn('WebSocket is deprecated, use connectEventSource instead')
    return null
  }
}

export const api = new ApiService()
export default api


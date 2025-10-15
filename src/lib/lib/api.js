const API_BASE = import.meta.env.DEV ? 'http://localhost:3000' : window.location.origin

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

export const api = new ApiService()
export default api

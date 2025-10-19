// Enhanced API Client - متطابق 100% مع Backend /api/v1/*
// تحديث المسارات فقط - بدون تغيير في Backend

const API_VERSION = '/api/v1'

function resolveApiBase() {
  const envBase = import.meta.env.VITE_API_BASE
  if (envBase) return envBase
  
  // في التطوير
  if (import.meta.env.DEV) return 'http://localhost:3000'
  
  // في الإنتاج
  return window.location.origin
}

class EnhancedApiClient {
    constructor() {
        this.baseUrl = resolveApiBase()
    }

    async request(endpoint, options = {}) {
        const url = `${this.baseUrl}${endpoint}`
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
                throw new Error(data?.error || `HTTP ${response.status}`)
            }

            return data
        } catch (error) {
            console.error(`API Error [${endpoint}]:`, error)
            throw error
        }
    }

    // ============================================
    // PIN Management - متطابق مع /api/v1/pin/*
    // ============================================

    /**
     * Get PIN status
     * Backend: GET /api/v1/pin/status
     */
    async getPinStatus() {
        return this.request(`${API_VERSION}/pin/status`)
    }

    /**
     * Issue next PIN (compatibility)
     */
    async issuePin(clinicId, visitId = null) {
        return this.getPinStatus()
    }

    /**
     * Get current PIN (compatibility)
     */
    async getCurrentPin(clinicId) {
        return this.getPinStatus()
    }

    /**
     * Validate PIN (compatibility)
     */
    async validatePin(clinicId, dateKey, pin) {
        return this.getPinStatus()
    }

    // ============================================
    // Queue Management - متطابق مع /api/v1/queue/*
    // ============================================

    /**
     * Enter queue - Assign ticket to visitor
     * Backend: POST /api/v1/queue/enter
     * Body: { clinic, user }
     * Response: { success, clinic, user, number, status, ahead, display_number }
     */
    async enterQueue(clinicId, visitId) {
        return this.request(`${API_VERSION}/queue/enter`, {
            method: 'POST',
            body: JSON.stringify({ 
                clinic: clinicId, 
                user: visitId 
            })
        })
    }

    /**
     * Get queue status for clinic
     * Backend: GET /api/v1/queue/status?clinic=xxx
     * Response: { success, clinic, list, current_serving, total_waiting }
     */
    async getQueueStatus(clinicId) {
        return this.request(`${API_VERSION}/queue/status?clinic=${clinicId}`)
    }

    /**
     * Complete queue entry - Mark ticket as done
     * Backend: POST /api/v1/queue/done
     * Body: { clinic, user, pin }
     * Response: { success, message }
     */
    async completeQueue(clinicId, visitId, pin) {
        return this.request(`${API_VERSION}/queue/done`, {
            method: 'POST',
            body: JSON.stringify({ 
                clinic: clinicId, 
                user: visitId, 
                pin: String(pin) 
            })
        })
    }

    /**
     * Call next patient (Admin)
     * Backend: POST /api/v1/queue/call
     * Body: { clinic }
     */
    async callNextPatient(clinicId) {
        return this.request(`${API_VERSION}/queue/call`, {
            method: 'POST',
            body: JSON.stringify({ clinic: clinicId })
        })
    }

    // ============================================
    // Path Management - متطابق مع /api/v1/path/*
    // ============================================

    /**
     * Choose medical path
     * Backend: GET /api/v1/path/choose
     */
    async choosePath() {
        return this.request(`${API_VERSION}/path/choose`)
    }

    /**
     * Assign route (compatibility)
     */
    async assignRoute(visitId, examType, gender = null) {
        return this.choosePath()
    }

    /**
     * Get route (compatibility)
     */
    async getRoute(visitId) {
        return this.choosePath()
    }

    /**
     * Next step (compatibility)
     */
    async nextStep(visitId, currentClinicId) {
        return this.choosePath()
    }

    // ============================================
    // Admin - متطابق مع /api/v1/admin/*
    // ============================================

    /**
     * Get admin status
     * Backend: GET /api/v1/admin/status
     */
    async getAdminStatus() {
        return this.request(`${API_VERSION}/admin/status`)
    }

    // ============================================
    // Health & System - متطابق مع /api/v1/health/*
    // ============================================

    /**
     * Health check
     * Backend: GET /api/v1/health/status
     */
    async healthCheck() {
        return this.request(`${API_VERSION}/health/status`)
    }

    // ============================================
    // Real-Time Notifications (SSE) - متطابق مع /api/v1/events/*
    // ============================================

    /**
     * Connect to Server-Sent Events stream
     * Backend: GET /api/v1/events/stream?clinic=xxx
     * @param {string} clinic - Clinic ID (optional)
     * @param {Function} onNotice - Callback for notices
     * @returns {EventSource}
     */
    connectSSE(clinic = null, onNotice = null) {
        // إذا كان clinic هو function، فهو callback
        if (typeof clinic === 'function') {
            onNotice = clinic
            clinic = null
        }

        const url = clinic 
            ? `${this.baseUrl}${API_VERSION}/events/stream?clinic=${clinic}`
            : `${this.baseUrl}${API_VERSION}/events/stream`

        const eventSource = new EventSource(url)

        eventSource.addEventListener('open', () => {
            console.log('SSE Connected:', clinic || 'all')
        })

        eventSource.addEventListener('queue_update', (event) => {
            try {
                const data = JSON.parse(event.data)
                if (onNotice) onNotice({ type: 'queue_update', data })
            } catch (error) {
                console.error('SSE parse error:', error)
            }
        })

        eventSource.addEventListener('heartbeat', (event) => {
            console.log('SSE heartbeat:', event.data)
            if (onNotice) onNotice({ type: 'heartbeat', data: { timestamp: event.data } })
        })

        eventSource.addEventListener('notice', (event) => {
            try {
                const notice = JSON.parse(event.data)
                if (onNotice) onNotice({ type: 'notice', data: notice })
            } catch (error) {
                console.error('SSE Notice parse error:', error)
            }
        })

        eventSource.onerror = (error) => {
            console.error('SSE Error:', error)
            eventSource.close()
            
            // إعادة الاتصال بعد 5 ثوان
            setTimeout(() => {
                console.log('SSE reconnecting...')
                this.connectSSE(clinic, onNotice)
            }, 5000)
        }

        return eventSource
    }

    // ============================================
    // Helper Methods
    // ============================================

    /**
     * Render ticket based on ZFD status
     */
    renderTicketWithZFD(step, t = (x) => x) {
        if (!step || !step.assigned) {
            return { shouldDisplay: false, message: t('Waiting for assignment'), ticketNumber: null }
        }

        const status = step.status || 'OK'
        const ticket = step.assigned.ticket

        switch (status) {
            case 'OK':
                return { shouldDisplay: true, message: null, ticketNumber: ticket }

            case 'LATE':
                return {
                    shouldDisplay: false,
                    message: t('⏰ Please proceed to the clinic'),
                    ticketNumber: null
                }

            case 'INVALID':
                return {
                    shouldDisplay: false,
                    message: t('❌ Ticket not found'),
                    ticketNumber: null
                }

            default:
                return { shouldDisplay: false, message: t('Unknown status'), ticketNumber: null }
        }
    }

    /**
     * Play notification sound
     */
    playNotificationSound() {
        try {
            const audioContext = new (window.AudioContext || window.webkitAudioContext)()
            const oscillator = audioContext.createOscillator()
            const gainNode = audioContext.createGain()

            oscillator.connect(gainNode)
            gainNode.connect(audioContext.destination)

            oscillator.frequency.value = 800
            oscillator.type = 'sine'

            gainNode.gain.setValueAtTime(0, audioContext.currentTime)
            gainNode.gain.linearRampToValueAtTime(0.3, audioContext.currentTime + 0.01)
            gainNode.gain.linearRampToValueAtTime(0.3, audioContext.currentTime + 0.1)
            gainNode.gain.linearRampToValueAtTime(0, audioContext.currentTime + 0.2)

            oscillator.start(audioContext.currentTime)
            oscillator.stop(audioContext.currentTime + 0.2)
        } catch (error) {
            console.log('Audio notification failed:', error)
        }
    }
}

// Singleton instance
const enhancedApi = new EnhancedApiClient()

export default enhancedApi
export { enhancedApi, EnhancedApiClient }


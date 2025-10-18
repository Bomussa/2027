// Enhanced API Client - Connects to Backend 2026 APIs
// Uses correct endpoints with ZFD validation

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:3000'

class EnhancedApiClient {
    constructor() {
        this.baseUrl = API_BASE
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
    // PIN Management
    // ============================================

    /**
     * Issue next PIN for clinic
     * @param {string} clinicId - Clinic identifier
     * @param {string} [visitId] - Optional visit ID for ZFD validation
     * @returns {Promise<{ok: boolean, pin: string, dateKey: string}>}
     */
    async issuePin(clinicId, visitId = null) {
        return this.request('/api/pin/issue', {
            method: 'POST',
            body: JSON.stringify({ clinicId, visitId })
        })
    }

    /**
     * Get current PIN for clinic (Admin)
     * @param {string} clinicId - Clinic identifier
     * @returns {Promise<{ok: boolean, clinicId: string, dateKey: string, currentPin: string, totalIssued: number, allPins: string[]}>}
     */
    async getCurrentPin(clinicId) {
        return this.request(`/api/pin/current/${clinicId}`)
    }

    /**
     * Validate PIN for clinic access
     * @param {string} clinicId - Clinic identifier
     * @param {string} dateKey - Date key (YYYY-MM-DD)
     * @param {string} pin - PIN to validate
     * @returns {Promise<{ok: boolean}>}
     */
    async validatePin(clinicId, dateKey, pin) {
        return this.request('/api/pin/validate', {
            method: 'POST',
            body: JSON.stringify({ clinicId, dateKey, pin })
        })
    }

    // ============================================
    // Queue Management
    // ============================================

    /**
     * Enter queue - Assign ticket to visitor
     * @param {string} clinicId - Clinic identifier
     * @param {string} visitId - Visit identifier
     * @returns {Promise<{ok: boolean, ticket: number, clinicId: string, dateKey: string, status: string}>}
     */
    async enterQueue(clinicId, visitId) {
        return this.request('/api/queue/enter', {
            method: 'POST',
            body: JSON.stringify({ clinicId, visitId })
        })
    }

    /**
     * Get queue status for clinic (Admin)
     * @param {string} clinicId - Clinic identifier
     * @returns {Promise<{ok: boolean, clinicId: string, dateKey: string, waiting: Array, in: Array, done: Array, nextCallTicket: number, stats: Object}>}
     */
    async getQueueStatus(clinicId) {
        return this.request(`/api/queue/status/${clinicId}`)
    }

    /**
     * Complete queue entry - Mark ticket as done
     * @param {string} clinicId - Clinic identifier
     * @param {string} visitId - Visit identifier
     * @param {number} ticket - Ticket number
     * @returns {Promise<{ok: boolean}>}
     */
    async completeQueue(clinicId, visitId, ticket) {
        return this.request('/api/queue/complete', {
            method: 'POST',
            body: JSON.stringify({ clinicId, visitId, ticket })
        })
    }

    // ============================================
    // Route/Journey Management
    // ============================================

    /**
     * Assign route for visitor journey
     * @param {string} visitId - Visit identifier
     * @param {string} examType - Exam type (e.g., "رجال/عام")
     * @param {string} [gender] - Gender ('M' or 'F')
     * @returns {Promise<{ok: boolean, route: Object}>}
     */
    async assignRoute(visitId, examType, gender = null) {
        return this.request('/api/route/assign', {
            method: 'POST',
            body: JSON.stringify({ visitId, examType, gender })
        })
    }

    /**
     * Get route with ZFD validation
     * @param {string} visitId - Visit identifier
     * @returns {Promise<{ok: boolean, route: Object}>}
     */
    async getRoute(visitId) {
        return this.request(`/api/route/${visitId}`)
    }

    /**
     * Move to next step in journey
     * @param {string} visitId - Visit identifier
     * @param {string} currentClinicId - Current clinic ID
     * @returns {Promise<{ok: boolean, route: Object}>}
     */
    async nextStep(visitId, currentClinicId) {
        return this.request('/api/route/next', {
            method: 'POST',
            body: JSON.stringify({ visitId, currentClinicId })
        })
    }

    // ============================================
    // Health & System
    // ============================================

    /**
     * Health check
     * @returns {Promise<{ok: boolean, ts: string, status: Object, settingsSummary: Object}>}
     */
    async healthCheck() {
        return this.request('/api/health')
    }

    // ============================================
    // Real-Time Notifications (SSE)
    // ============================================

    /**
     * Connect to Server-Sent Events stream
     * @param {Function} onNotice - Callback for notices
     * @returns {EventSource}
     */
    connectSSE(onNotice) {
        const eventSource = new EventSource(`${this.baseUrl}/api/events`)

        eventSource.addEventListener('hello', (event) => {
            console.log('SSE Connected:', JSON.parse(event.data))
        })

        eventSource.addEventListener('notice', (event) => {
            try {
                const notice = JSON.parse(event.data)
                if (onNotice) onNotice(notice)
            } catch (error) {
                console.error('SSE Notice parse error:', error)
            }
        })

        eventSource.onerror = (error) => {
            console.error('SSE Error:', error)
            // EventSource will auto-reconnect
        }

        return eventSource
    }

    // ============================================
    // Helper Methods
    // ============================================

    /**
     * Render ticket based on ZFD status
     * @param {Object} step - Route step with status
     * @param {Function} t - Translation function
     * @returns {Object} - {shouldDisplay: boolean, message: string, ticketNumber: number|null}
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

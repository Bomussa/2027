// Queue Engine - يستعلم من الباك اند بدلاً من التخزين المحلي
import eventBus from './event-bus.js'
import notificationEngine from './notification-engine.js'

const API_BASE = '/api/v1'

class QueueEngine {
  constructor() {
    this.updateInterval = null
    this.init()
  }

  init() {
    // تحديث كل 15 ثانية
    this.updateInterval = setInterval(() => {
      this.refreshAllQueues()
    }, 15000)
  }

  /**
   * تحديث جميع الطوابير من قاعدة البيانات
   */
  async refreshAllQueues() {
    try {
      const response = await fetch(`${API_BASE}/admin/clinic-stats`)
      if (response.ok) {
        const data = await response.json()
        
        // إرسال تحديثات لكل عيادة
        if (data.clinics) {
          data.clinics.forEach(clinic => {
            eventBus.emit('queue:update', {
              clinicId: clinic.id,
              waiting: clinic.waiting_count,
              entered: clinic.entered_count,
              exited: clinic.exited_count
            })
          })
        }
      }
    } catch (error) {
      console.error('[Queue Engine] Failed to refresh queues:', error)
    }
  }

  /**
   * إضافة مراجع إلى الطابور (عبر API)
   */
  async addToQueue(clinicId, patientId) {
    try {
      const response = await fetch(`${API_BASE}/queue/enter`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clinicId, patientId })
      })
      
      if (!response.ok) {
        throw new Error('Failed to enter queue')
      }
      
      const data = await response.json()
      
      // إرسال إشعار
      eventBus.emit('queue:joined', {
        patientId,
        clinicId,
        number: data.queue_number,
        waiting: data.waiting_count
      })
      
      return data
    } catch (error) {
      console.error('[Queue Engine] Failed to add to queue:', error)
      throw error
    }
  }

  /**
   * استدعاء التالي (عبر API)
   */
  async callNext(clinicId) {
    try {
      const response = await fetch(`${API_BASE}/queue/call`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clinicId })
      })
      
      if (!response.ok) {
        throw new Error('Failed to call next')
      }
      
      const data = await response.json()
      
      // إرسال إشعار
      if (data.patient) {
        eventBus.emit('queue:your_turn', {
          patientId: data.patient.patientId,
          clinicId: clinicId,
          number: data.patient.number
        })
        
        notificationEngine.send({
          type: 'YOUR_TURN',
          patientId: data.patient.patientId,
          title: 'حان دورك!',
          message: `توجه إلى ${clinicId} الآن`,
          priority: 'high'
        })
      }
      
      return data
    } catch (error) {
      console.error('[Queue Engine] Failed to call next:', error)
      throw error
    }
  }

  /**
   * الحصول على موقع المراجع (عبر API)
   */
  async getMyPosition(patientId, clinicId) {
    try {
      const response = await fetch(
        `${API_BASE}/patient/my-position?patientId=${patientId}&clinic=${clinicId}`
      )
      
      if (!response.ok) {
        throw new Error('Failed to get position')
      }
      
      const data = await response.json()
      return data
    } catch (error) {
      console.error('[Queue Engine] Failed to get position:', error)
      throw error
    }
  }

  /**
   * إنهاء الخدمة (عبر API)
   */
  async markDone(clinicId, patientId) {
    try {
      const response = await fetch(`${API_BASE}/queue/done`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clinicId, patientId })
      })
      
      if (!response.ok) {
        throw new Error('Failed to mark done')
      }
      
      const data = await response.json()
      
      // إرسال إشعار
      eventBus.emit('queue:completed', {
        patientId,
        clinicId,
        duration: data.duration
      })
      
      return data
    } catch (error) {
      console.error('[Queue Engine] Failed to mark done:', error)
      throw error
    }
  }

  /**
   * الحصول على حالة العيادة (عبر API)
   */
  async getClinicStatus(clinicId) {
    try {
      const response = await fetch(`${API_BASE}/queue/status?clinic=${clinicId}`)
      
      if (!response.ok) {
        throw new Error('Failed to get clinic status')
      }
      
      const data = await response.json()
      return data
    } catch (error) {
      console.error('[Queue Engine] Failed to get clinic status:', error)
      throw error
    }
  }

  /**
   * تنظيف
   */
  destroy() {
    if (this.updateInterval) {
      clearInterval(this.updateInterval)
    }
  }
}

// Singleton
const queueEngine = new QueueEngine()
export default queueEngine


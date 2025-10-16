// محرك الإشعارات (Notification Engine) - النظام الرسمي
import eventBus from './event-bus.js'

const NOTIFICATION_TYPES = {
  START_HINT: 'START_HINT',
  NEAR_TURN: 'NEAR_TURN',
  YOUR_TURN: 'YOUR_TURN',
  STEP_DONE_NEXT: 'STEP_DONE_NEXT',
  RESET_DONE: 'RESET_DONE',
  CLINIC_OPENED: 'CLINIC_OPENED',
  CLINIC_CLOSED: 'CLINIC_CLOSED'
}

class NotificationEngine {
  constructor() {
    this.subscribers = new Map() // patientId -> callback
    this.adminSubscribers = new Set() // admin callbacks
  }

  subscribe(patientId, callback) {
    this.subscribers.set(patientId, callback)
    
    // إرسال إشعار البداية
    const notification = {
      type: NOTIFICATION_TYPES.START_HINT,
      message: 'مرحباً بك في نظام اللجنة الطبية',
      timestamp: new Date().toISOString()
    }
    
    this.notify(patientId, notification)
    eventBus.emit('notification', { patientId, ...notification })

    return () => this.subscribers.delete(patientId)
  }

  subscribeAdmin(callback) {
    this.adminSubscribers.add(callback)
    return () => this.adminSubscribers.delete(callback)
  }

  notify(patientId, notification) {
    const callback = this.subscribers.get(patientId)
    if (callback) {
      callback(notification)
    }
  }

  notifyAdmin(notification) {
    for (const callback of this.adminSubscribers) {
      callback(notification)
    }
  }

  async sendNearTurn(patientId, clinicName, position) {
    this.notify(patientId, {
      type: NOTIFICATION_TYPES.NEAR_TURN,
      message: `اقترب دورك في ${clinicName}`,
      clinicName,
      position,
      timestamp: new Date().toISOString(),
      sound: true,
      priority: 'high'
    })
  }

  async sendYourTurn(patientId, clinicName, number) {
    this.notify(patientId, {
      type: NOTIFICATION_TYPES.YOUR_TURN,
      message: `حان دورك في ${clinicName}`,
      clinicName,
      number,
      timestamp: new Date().toISOString(),
      sound: true,
      vibrate: true,
      priority: 'urgent'
    })
  }

  async sendStepDone(patientId, currentClinic, nextClinic) {
    this.notify(patientId, {
      type: NOTIFICATION_TYPES.STEP_DONE_NEXT,
      message: `تم إنهاء ${currentClinic}، انتقل إلى ${nextClinic}`,
      currentClinic,
      nextClinic,
      timestamp: new Date().toISOString(),
      sound: true,
      priority: 'high'
    })
  }

  async sendResetDone() {
    this.notifyAdmin({
      type: NOTIFICATION_TYPES.RESET_DONE,
      message: 'تم إعادة تعيين النظام بنجاح',
      timestamp: new Date().toISOString(),
      priority: 'normal'
    })
  }

  async sendClinicOpened(clinicName) {
    this.notifyAdmin({
      type: NOTIFICATION_TYPES.CLINIC_OPENED,
      message: `تم فتح ${clinicName}`,
      clinicName,
      timestamp: new Date().toISOString(),
      priority: 'normal'
    })
  }

  async sendClinicClosed(clinicName) {
    this.notifyAdmin({
      type: NOTIFICATION_TYPES.CLINIC_CLOSED,
      message: `تم إغلاق ${clinicName}`,
      clinicName,
      timestamp: new Date().toISOString(),
      priority: 'normal'
    })
  }

  // SSE Stream للمراجع
  createPatientStream(patientId) {
    const stream = new ReadableStream({
      start: (controller) => {
        const unsubscribe = this.subscribe(patientId, (notification) => {
          const data = `data: ${JSON.stringify(notification)}\n\n`
          controller.enqueue(new TextEncoder().encode(data))
        })

        // Cleanup on close
        return () => unsubscribe()
      }
    })

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive'
      }
    })
  }

  // SSE Stream للإدارة
  createAdminStream() {
    const stream = new ReadableStream({
      start: (controller) => {
        const unsubscribe = this.subscribeAdmin((notification) => {
          const data = `data: ${JSON.stringify(notification)}\n\n`
          controller.enqueue(new TextEncoder().encode(data))
        })

        return () => unsubscribe()
      }
    })

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive'
      }
    })
  }
}

// Singleton instance
const notificationEngine = new NotificationEngine()

export default notificationEngine
export { NotificationEngine, NOTIFICATION_TYPES }


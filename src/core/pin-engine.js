// محرك البنكود (PIN Engine) - النظام الرسمي
import settings from '../../data/settings.json'

class PinEngine {
  constructor() {
    this.pins = new Map() // clinicId -> current PIN
    this.usedPins = new Map() // clinicId -> Set of used PINs
    this.lastReset = null
    this.init()
  }

  init() {
    this.checkDailyReset()
    // جدولة الفحص كل دقيقة
    setInterval(() => this.checkDailyReset(), 60000)
  }

  checkDailyReset() {
    const now = new Date()
    const qatarTime = new Date(now.toLocaleString('en-US', { timeZone: settings.REGION }))
    const resetTime = settings.PIN_RESET_TIME.split(':')
    const resetHour = parseInt(resetTime[0])
    const resetMinute = parseInt(resetTime[1])

    const lastResetDate = this.lastReset ? new Date(this.lastReset) : null
    const todayReset = new Date(qatarTime)
    todayReset.setHours(resetHour, resetMinute, 0, 0)

    // إذا تجاوزنا وقت الإعادة ولم نقم بالإعادة اليوم
    if (qatarTime >= todayReset && (!lastResetDate || lastResetDate < todayReset)) {
      this.resetAll()
      this.lastReset = qatarTime.toISOString()
    }
  }

  resetAll() {
    this.pins.clear()
    this.usedPins.clear()
    console.log(`[PIN Engine] Reset completed at ${new Date().toISOString()}`)
  }

  async assignNextPin(clinicId) {
    this.checkDailyReset()

    if (!this.usedPins.has(clinicId)) {
      this.usedPins.set(clinicId, new Set())
    }

    const used = this.usedPins.get(clinicId)
    
    // البحث عن أول PIN متاح
    for (let pin = settings.PIN_START; pin <= settings.PIN_END; pin++) {
      const pinStr = pin.toString().padStart(2, '0')
      if (!used.has(pinStr)) {
        used.add(pinStr)
        this.pins.set(clinicId, pinStr)
        return {
          pin: pinStr,
          clinicId,
          issuedAt: new Date().toISOString(),
          expiresAt: this.getNextResetTime()
        }
      }
    }

    throw new Error('No available PINs')
  }

  async verifyPin(clinicId, pin) {
    const currentPin = this.pins.get(clinicId)
    return currentPin === pin
  }

  getNextResetTime() {
    const now = new Date()
    const qatarTime = new Date(now.toLocaleString('en-US', { timeZone: settings.REGION }))
    const resetTime = settings.PIN_RESET_TIME.split(':')
    const resetHour = parseInt(resetTime[0])
    const resetMinute = parseInt(resetTime[1])

    const nextReset = new Date(qatarTime)
    nextReset.setHours(resetHour, resetMinute, 0, 0)

    // إذا كان وقت الإعادة قد مضى اليوم، اجعله غداً
    if (qatarTime >= nextReset) {
      nextReset.setDate(nextReset.getDate() + 1)
    }

    return nextReset.toISOString()
  }

  getActivePins() {
    const result = []
    for (const [clinicId, pin] of this.pins.entries()) {
      result.push({
        clinicId,
        pin,
        active: true,
        expiresAt: this.getNextResetTime()
      })
    }
    return result
  }

  deactivatePin(clinicId) {
    this.pins.delete(clinicId)
    return true
  }
}

// Singleton instance
const pinEngine = new PinEngine()

export default pinEngine
export { PinEngine }


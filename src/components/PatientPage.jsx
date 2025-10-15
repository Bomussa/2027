import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from './Card'
import { Button } from './Button'
import { Input } from './Input'
import { Lock, Unlock, Clock, Globe, LogIn, LogOut } from 'lucide-react'
import { getMedicalPathway, calculateWaitTime, examTypes, formatTime } from '../lib/utils'
import { t } from '../lib/i18n'
import api from '../lib/api'

export function PatientPage({ patientData, onLogout, language, toggleLanguage }) {
  const [stations, setStations] = useState([])
  const [pinInput, setPinInput] = useState('')
  const [selectedStation, setSelectedStation] = useState(null)
  const [loading, setLoading] = useState(false)
  const [activeTicket, setActiveTicket] = useState(null)

  useEffect(() => {
    // Get stations for the patient's exam type and gender
    const examStations = getMedicalPathway(patientData.queueType, patientData.gender)
    setStations(examStations.map((station, index) => ({
      ...station,
      status: index === 0 ? 'ready' : 'locked',
      current: 0,
      yourNumber: index === 0 ? 1 : 0,
      ahead: 0,
      requiresPinExit: index === 0, // PIN فقط لتأكيد انتهاء العيادة الأولى مبدئياً
      isEntered: false
    })))
  }, [patientData.queueType, patientData.gender])

  // أزلنا فتح العيادة عبر PIN: PIN فقط لتأكيد الخروج من العيادة المحددة

  const handleClinicEnter = async (station) => {
    try {
      setLoading(true)
      // Use the correct API endpoint for entering queue
      const res = await api.request('/api/queue/enter', {
        method: 'POST',
        body: JSON.stringify({
          visitId: patientData.id,
          clinicId: station.id,
          queueType: patientData.queueType
        })
      })
      // The backend returns { clinicId, ticket, verified }
      const ticket = res?.ticket || res?.queueNumber
      if (ticket) {
        setActiveTicket({ clinicId: station.id, ticket })
        setStations(prev => prev.map(s => s.id === station.id ? {
          ...s,
          current: ticket,
          yourNumber: ticket,
          ahead: 0,
          status: 'ready',
          isEntered: true
        } : s))

        // Show success notification
        const msg = language === 'ar' ? `تم الدخول - رقمك ${ticket}` : `Entered - Your number ${ticket}`
        alert(msg)
      }
    } catch (e) {
      console.error('Enter clinic failed', e)
      const msg = language === 'ar' ? 'فشل الدخول للعيادة' : 'Failed to enter clinic'
      alert(msg)
    } finally {
      setLoading(false)
    }
  }

  const handleClinicExit = async (station) => {
    try {
      setLoading(true)
      const ticket = activeTicket?.clinicId === station.id ? activeTicket.ticket : station.yourNumber

      // Require PIN to match the real ticket number only if this station requires PIN
      if (station.requiresPinExit) {
        if (!pinInput || String(pinInput).trim() !== String(ticket)) {
          alert(language === 'ar' ? 'الرمز لا يطابق رقم الدور' : 'PIN does not match ticket number')
          return
        }
      }

      // Use the correct API endpoint for completing queue
      await api.request('/api/queue/complete', {
        method: 'POST',
        body: JSON.stringify({
          clinicId: station.id,
          ticket: Number(ticket),
          queueType: patientData.queueType
        })
      })

      // Mark station completed and move to next
      setStations(prev => {
        const idx = prev.findIndex(s => s.id === station.id)
        if (idx >= 0 && idx + 1 < prev.length) {
          const next = [...prev]
          next[idx] = { ...next[idx], status: 'completed', exitTime: new Date() }
          next[idx + 1] = { ...next[idx + 1], status: 'ready', yourNumber: 1 }
          return next
        }
        return prev.map(s => s.id === station.id ? { ...s, status: 'completed', exitTime: new Date() } : s)
      })

      setPinInput('')
      setSelectedStation(null)

      // Show success notification
      const msg = language === 'ar' ? 'تم الخروج بنجاح' : 'Successfully exited'
      alert(msg)
    } catch (e) {
      console.error('Complete clinic failed', e)
      const msg = language === 'ar' ? 'فشل الخروج من العيادة' : 'Failed to exit clinic'
      alert(msg)
    } finally {
      setLoading(false)
    }
  }

  const getExamName = () => {
    const exam = examTypes.find(e => e.id === patientData.queueType)
    if (!exam) return language === 'ar' ? 'فحص طبي' : 'Medical Exam'
    return language === 'ar' ? exam.nameAr : exam.name
  }

  return (
    <div className="min-h-screen p-4">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Language Selector */}
        <div className="absolute top-4 right-4">
          <Button
            variant="ghost"
            size="sm"
            className="text-gray-300 hover:text-white hover:bg-gray-800/50"
            onClick={toggleLanguage}
          >
            <Globe className="icon icon-md me-2" />
            {language === 'ar' ? 'English 🇺🇸' : 'العربية 🇶🇦'}
          </Button>
        </div>

        {/* Header */}
        <div className="text-center space-y-4">
          <img src="/logo.jpeg" alt="قيادة الخدمات الطبية" className="mx-auto w-24 h-24 rounded-full shadow-lg" />

          <div>
            <h1 className="text-2xl font-bold text-white">
              {language === 'ar' ? 'قيادة الخدمات الطبية' : 'Medical Services Command'}
            </h1>
            <p className="text-lg text-gray-300">
              {language === 'ar' ? 'Medical Services' : 'قيادة الخدمات الطبية'}
            </p>
            <p className="text-gray-400 text-sm">
              {language === 'ar'
                ? 'المركز الطبي المتخصص العسكري - العطار'
                : 'Military Specialized Medical Center – Al-Attar'}
            </p>
          </div>
        </div>

        {/* Medical Route */}
        <Card className="bg-gray-800/50 border-gray-700">
          <CardHeader className="text-center">
            <CardTitle className="text-white text-xl">{t('yourMedicalRoute', language)}</CardTitle>
            <p className="text-gray-400">{t('exam', language)}: {getExamName()}</p>
          </CardHeader>
          <CardContent className="space-y-4">
            {stations.map((station, index) => (
              <Card key={station.id} className="bg-gray-700/50 border-gray-600">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      {station.status === 'ready' ? (
                        <Unlock className="icon icon-lg icon-success" />
                      ) : (
                        <Lock className="icon icon-lg icon-muted" />
                      )}
                      <div>
                        <h3 className="text-white font-semibold">
                          {language === 'ar' ? station.nameAr : station.name}
                        </h3>
                        <p className="text-gray-400 text-sm">
                          {t('floor', language)}: {language === 'ar' ? station.floor : station.floorCode}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className={`px-3 py-1 rounded-full text-sm font-medium ${station.status === 'ready' ? 'bg-green-500/20 text-green-400' :
                        station.status === 'completed' ? 'bg-blue-500/20 text-blue-400' :
                          'bg-gray-500/20 text-gray-400'
                        }`}>
                        {station.status === 'ready' ? t('ready', language) :
                          station.status === 'completed' ? t('completed', language) :
                            t('locked', language)}
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div>
                      <div className="text-2xl font-bold text-white">{station.current}</div>
                      <div className="text-gray-400 text-sm">{t('current', language)}</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-yellow-400">{station.yourNumber || '-'}</div>
                      <div className="text-gray-400 text-sm">{t('yourNumber', language)}</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-white">{station.ahead}</div>
                      <div className="text-gray-400 text-sm">{t('ahead', language)}</div>
                    </div>
                  </div>

                  {/* Exit via PIN only for the first clinic when leaving */}
                  {/* لم نعد نستخدم فتح via PIN */}

                  {/* Enter/Exit controls for the first clinic: Enter without PIN, Exit with PIN matching ticket */}
                  {index === 0 && (
                    <div className="mt-4 pt-4 border-t border-gray-600 space-y-3">
                      <div className="flex flex-wrap gap-2">
                        <Button
                          variant="gradientPrimary"
                          onClick={() => handleClinicEnter(station)}
                          disabled={loading}
                          title={t('enterClinic', language)}
                        >
                          <LogIn className={`icon icon-md me-2 ${station.isEntered ? 'text-green-400' : ''}`} />
                          {t('enterClinic', language)}
                        </Button>
                      </div>
                      <div className="flex flex-wrap gap-2 items-center">
                        <Input
                          type="text"
                          placeholder={`${t('enterPIN', language)} (${t('ticketNumber', language)})`}
                          value={selectedStation?.id === station.id ? pinInput : ''}
                          onChange={(e) => { setSelectedStation(station); setPinInput(e.target.value) }}
                          className="bg-gray-600 border-gray-500 text-white"
                          maxLength={6}
                        />
                        <Button
                          variant="gradientSecondary"
                          onClick={() => handleClinicExit(station)}
                          disabled={loading || selectedStation?.id !== station.id || !pinInput.trim()}
                          title={t('exitClinic', language)}
                        >
                          <LogOut className="icon icon-md me-2" />
                          {t('exitClinic', language)}
                        </Button>
                      </div>
                      {station.exitTime && (
                        <div className="text-sm text-gray-400 flex items-center gap-2">
                          <Clock className="icon icon-sm icon-muted" />
                          <span>{language === 'ar' ? 'وقت الخروج:' : 'Exit time:'} {formatTime(new Date(station.exitTime))}</span>
                        </div>
                      )}
                    </div>
                  )}

                  {station.status === 'ready' && station.ahead > 0 && (
                    <div className="mt-4 pt-4 border-t border-gray-600">
                      <p className="text-gray-400 text-sm">
                        {language === 'ar'
                          ? `يمكنك الوصول عبر المصعد – اضغط ${station.floorCode}`
                          : `You can reach via elevator – press ${station.floorCode}`}
                      </p>
                    </div>
                  )}

                  {station.note && (
                    <div className="mt-4 pt-4 border-t border-gray-600">
                      <p className="text-yellow-400 text-sm">
                        ⚠️ {t('note', language)}: {t('registerAtReception', language)}
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </CardContent>
        </Card>

        {/* Logout Button */}
        <div className="text-center">
          <Button variant="outline" onClick={onLogout} className="border-gray-600 text-gray-300">
            {t('exitSystem', language)}
          </Button>
        </div>
      </div>
    </div>
  )
}

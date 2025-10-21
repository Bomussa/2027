import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from './Card'
import { Button } from './Button'
import { Input } from './Input'
import { Lock, Unlock, Clock, Globe, LogIn, LogOut } from 'lucide-react'
import { getMedicalPathway, calculateWaitTime, examTypes, formatTime } from '../lib/utils'
import { t } from '../lib/i18n'
import api from '../lib/api'
import enhancedApi from '../lib/enhanced-api'
import { ZFDTicketDisplay, ZFDBanner } from './ZFDTicketDisplay'
import NotificationSystem from './NotificationSystem'

export function PatientPage({ patientData, onLogout, language, toggleLanguage }) {
  const [stations, setStations] = useState([])
  const [pinInput, setPinInput] = useState('')
  const [selectedStation, setSelectedStation] = useState(null)
  const [loading, setLoading] = useState(false)
  const [clinicPins, setClinicPins] = useState({})
  const [activeTicket, setActiveTicket] = useState(null)
  const [currentNotice, setCurrentNotice] = useState(null)
  const [routeWithZFD, setRouteWithZFD] = useState(null)

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

  // Fetch route with ZFD validation
  useEffect(() => {
    if (patientData?.id) {
      enhancedApi.getRoute(patientData.id)
        .then(data => {
          if (data?.route) {
            setRouteWithZFD(data)
          }
        })
        .catch(err => console.warn('Route fetch failed:', err))
    }
  }, [patientData?.id])

  // Connect to SSE for real-time notifications
  useEffect(() => {
    if (!patientData?.id) return;
    
    // Connect to SSE with user parameter
    const url = `/api/v1/events/stream?user=${patientData.id}`;
    const eventSource = new EventSource(url);
    
    eventSource.addEventListener('queue_update', (e) => {
      try {
        const data = JSON.parse(e.data);
        const message = language === 'ar' ? data.message : data.messageEn;
        
        // Show notification
        setCurrentNotice({
          type: data.type,
          message,
          position: data.position,
          clinic: data.clinic
        });
        
        // Play sound
        enhancedApi.playNotificationSound();
        
        // Auto-dismiss after 10 seconds
        setTimeout(() => setCurrentNotice(null), 10000);
      } catch (err) {
        console.error('SSE parse error:', err);
      }
    });
    
    eventSource.addEventListener('connected', (e) => {
      console.log('SSE connected:', e.data);
    });
    
    eventSource.onerror = (err) => {
      console.error('SSE error:', err);
      eventSource.close();
    };

    return () => {
      eventSource.close();
    };
  }, [patientData?.id, language])

  // أزلنا فتح العيادة عبر PIN: PIN فقط لتأكيد الخروج من العيادة المحددة

  const handleClinicEnter = async (station) => {
    try {
      // Request PIN from staff before entering
      const pin = prompt(language === 'ar' ? 'أدخل PIN العيادة (من الموظف)' : 'Enter clinic PIN (from staff)')
      if (!pin || !pin.trim()) {
        alert(language === 'ar' ? 'PIN مطلوب' : 'PIN required')
        return
      }
      
      setLoading(true)
      // Use the correct API endpoint: POST /api/v1/queue/enter
      const res = await api.enterQueue(station.id, patientData.id, pin)
      // Backend returns: { success, clinic, user, number, status, ahead, display_number }
      const ticket = res?.display_number || res?.number
      if (ticket) {
        // Save PIN for this clinic
        setClinicPins(prev => ({ ...prev, [station.id]: pin }))
        
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

      // Use the correct API endpoint: POST /api/v1/queue/done
      const clinicPin = clinicPins[station.id]
      if (!clinicPin) {
        alert('خطأ: لم يتم العثور على PIN للعيادة')
        return
      }
      await api.queueDone(station.id, patientData.id, clinicPin)

      // Mark station completed and move to next
      setStations(prev => {
        const idx = prev.findIndex(s => s.id === station.id)
        if (idx >= 0 && idx + 1 < prev.length) {
          const next = [...prev]
          next[idx] = { ...next[idx], status: 'completed', exitTime: new Date() }
          
          // Fetch real queue data for next clinic
          const nextClinicId = next[idx + 1].id
          api.getQueueStatus(nextClinicId)
            .then(queueData => {
              setStations(current => current.map((s, i) => {
                if (i === idx + 1) {
                  return {
                    ...s,
                    status: 'ready',
                    current: queueData.current || 0,
                    yourNumber: (queueData.current || 0) + 1,
                    ahead: queueData.waiting || 0,
                    requiresPinExit: true
                  }
                }
                return s
              }))
            })
            .catch(err => {
              console.error('Failed to fetch next clinic queue:', err)
              // Fallback: just unlock next clinic
              setStations(current => current.map((s, i) => 
                i === idx + 1 ? { ...s, status: 'ready', yourNumber: 1 } : s
              ))
            })
          
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

  // Check if all stations are completed
  const allStationsCompleted = stations.length > 0 && stations.every(s => s.status === 'completed')

  // If all completed, show completion screen (Screen 4)
  if (allStationsCompleted) {
    return (
      <div className="min-h-screen p-4 flex items-center justify-center" data-test="completion-screen">
        <div className="max-w-2xl mx-auto space-y-6 text-center">
          {/* Logo */}
          <img src="/logo.jpeg" alt="قيادة الخدمات الطبية" className="mx-auto w-32 h-32 object-contain rounded-full shadow-lg" />

          {/* Success Icon */}
          <div className="text-green-400">
            <svg className="w-24 h-24 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>

          {/* Completion Message */}
          <Card className="bg-gradient-to-br from-green-900/30 to-blue-900/30 border-green-500/30">
            <CardContent className="p-8 space-y-6">
              <h1 className="text-3xl font-bold text-white">
                {language === 'ar' ? '✅ تم إنهاء الفحص الطبي' : '✅ Medical Examination Completed'}
              </h1>
              
              <div className="space-y-4 text-lg">
                <p className="text-gray-300">
                  {language === 'ar' 
                    ? 'تهانينا! لقد أكملت جميع الفحوصات الطبية المطلوبة بنجاح'
                    : 'Congratulations! You have successfully completed all required medical examinations'}
                </p>

                <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-6 mt-6">
                  <h2 className="text-2xl font-bold text-yellow-400 mb-4">
                    {language === 'ar' ? '📋 الخطوة التالية' : '📋 Next Step'}
                  </h2>
                  <p className="text-xl text-white font-semibold">
                    {language === 'ar'
                      ? 'يرجى التوجه إلى استقبال اللجنة الطبية'
                      : 'Please proceed to the Medical Committee Reception'}
                  </p>
                  <p className="text-gray-300 mt-3">
                    {language === 'ar'
                      ? 'الموقع: الطابق الأول - مكتب الاستقبال'
                      : 'Location: First Floor - Reception Office'}
                  </p>
                </div>

                {/* Summary */}
                <div className="bg-gray-800/50 border border-gray-600 rounded-lg p-6 mt-6">
                  <h3 className="text-xl font-bold text-white mb-4">
                    {language === 'ar' ? 'ملخص الفحوصات' : 'Examination Summary'}
                  </h3>
                  <div className="space-y-2 text-left">
                    <p className="text-gray-300">
                      <span className="font-semibold">{language === 'ar' ? 'نوع الفحص:' : 'Exam Type:'}</span> {getExamName()}
                    </p>
                    <p className="text-gray-300">
                      <span className="font-semibold">{language === 'ar' ? 'عدد العيادات:' : 'Number of Clinics:'}</span> {stations.length}
                    </p>
                    <p className="text-gray-300">
                      <span className="font-semibold">{language === 'ar' ? 'الحالة:' : 'Status:'}</span> 
                      <span className="text-green-400 font-bold"> {language === 'ar' ? 'مكتمل ✓' : 'Completed ✓'}</span>
                    </p>
                  </div>
                </div>

                {/* Clinics List */}
                <div className="bg-gray-800/50 border border-gray-600 rounded-lg p-6 mt-4">
                  <h3 className="text-lg font-bold text-white mb-3">
                    {language === 'ar' ? 'العيادات المكتملة:' : 'Completed Clinics:'}
                  </h3>
                  <div className="space-y-2">
                    {stations.map((station, index) => (
                      <div key={station.id} className="flex items-center justify-between text-sm">
                        <span className="text-gray-300">
                          {index + 1}. {language === 'ar' ? station.nameAr : station.name}
                        </span>
                        <span className="text-green-400">✓</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-4 justify-center mt-8">
                <Button 
                  variant="default" 
                  size="lg"
                  onClick={onLogout}
                  className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-bold px-8 py-3 text-lg"
                >
                  {language === 'ar' ? '🏠 العودة للصفحة الرئيسية' : '🏠 Return to Home'}
                </Button>
              </div>

              {/* Footer Note */}
              <p className="text-gray-400 text-sm mt-6">
                {language === 'ar'
                  ? 'شكراً لاستخدامكم نظام إدارة الطوابير الطبية'
                  : 'Thank you for using the Medical Queue Management System'}
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen p-4" data-test="patient-page">
      {/* Real-time notification banner */}
      {currentNotice && (
        <ZFDBanner
          notice={currentNotice}
          onDismiss={() => setCurrentNotice(null)}
        />
      )}

      {/* نظام الإشعارات اللحظية */}
      {stations.find(s => s.status === 'active') && (
        <NotificationSystem
          patientId={patientData?.id}
          currentClinic={stations.find(s => s.status === 'active')}
          yourNumber={stations.find(s => s.status === 'active')?.yourNumber}
          currentServing={stations.find(s => s.status === 'active')?.current}
        />
      )}

      <div className="max-w-4xl mx-auto space-y-6">
        {/* Language Selector */}
        <div className="absolute top-4 left-4">
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
          <img src="/logo.jpeg" alt="قيادة الخدمات الطبية" className="mx-auto w-24 h-24 object-contain rounded-full shadow-lg" />

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

                  {/* ZFD-powered ticket display */}
                  {routeWithZFD && routeWithZFD.route && routeWithZFD.route.length > index && (
                    <div className="mb-4" data-test="zfd-ticket-section">
                      <ZFDTicketDisplay step={routeWithZFD.route[index]} />
                    </div>
                  )}

                  <div className="grid grid-cols-3 gap-4 text-center" data-test="queue-info">
                    <div>
                      <div className="text-2xl font-bold text-white" data-test="current-number">{station.current}</div>
                      <div className="text-gray-400 text-sm">{t('current', language)}</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-yellow-400" data-test="your-number">{station.yourNumber || '-'}</div>
                      <div className="text-gray-400 text-sm">{t('yourNumber', language)}</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-white" data-test="ahead-count">{station.ahead}</div>
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
                          data-test="enter-clinic-btn"
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
                          data-test="pin-input"
                        />
                        <Button
                          variant="gradientSecondary"
                          onClick={() => handleClinicExit(station)}
                          disabled={loading || selectedStation?.id !== station.id || !pinInput.trim()}
                          title={t('exitClinic', language)}
                          data-test="exit-clinic-btn"
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

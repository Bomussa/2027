import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from './Card'
import { Button } from './Button'
import { Input } from './Input'
import { Lock, Unlock, Clock, Globe, LogIn, LogOut } from 'lucide-react'
import { calculateWaitTime, examTypes, formatTime } from '../lib/utils'
import { getDynamicMedicalPathway } from '../lib/dynamic-pathways'
import { t } from '../lib/i18n'
import api from '../lib/api'
import enhancedApi from '../lib/enhanced-api'
import { ZFDTicketDisplay, ZFDBanner } from './ZFDTicketDisplay'
import NotificationSystem from './NotificationSystem'
import eventBus from '../core/event-bus'

export function PatientPage({ patientData, onLogout, language, toggleLanguage }) {
  const [stations, setStations] = useState([])
  const [pinInput, setPinInput] = useState('')
  const [selectedStation, setSelectedStation] = useState(null)
  const [loading, setLoading] = useState(false)
  const [clinicPins, setClinicPins] = useState({}) // أرقام البن كود اليومية
  const [activeTicket, setActiveTicket] = useState(null)
  const [currentNotice, setCurrentNotice] = useState(null)
  const [routeWithZFD, setRouteWithZFD] = useState(null)

  // جلب أرقام البن كود اليومية من API
  useEffect(() => {
    const fetchDailyPins = async () => {
      try {
        const response = await fetch('/api/v1/pin/status')
        const data = await response.json()
        if (data.pins) {
          // تحويل البيانات إلى صيغة { clinic_id: pin_number }
          const pinsMap = {}
          Object.keys(data.pins).forEach(key => {
            pinsMap[key] = data.pins[key].pin
          })
          setClinicPins(pinsMap)
          console.log('Daily PINs loaded:', pinsMap)
        }
      } catch (err) {
        console.error('Failed to fetch daily PINs:', err)
      }
    }
    
    fetchDailyPins()
    // تحديث كل 5 دقائق
    const interval = setInterval(fetchDailyPins, 5 * 60 * 1000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    // Get stations for the patient's exam type and gender with dynamic weighting
    const loadPathway = async () => {
      try {
        let examStations = null
        
        // محاولة جلب المسار المحفوظ أولاً
        try {
          const savedRoute = await api.getRoute(patientData.id)
          if (savedRoute && savedRoute.success && savedRoute.route && savedRoute.route.stations) {
            examStations = savedRoute.route.stations
            console.log('✅ Loaded saved route from backend')
          }
        } catch (err) {
          console.log('ℹ️ No saved route found, creating new one')
        }
        
        // إذا لم يوجد مسار محفوظ، احسب مسار جديد
        if (!examStations) {
          examStations = await getDynamicMedicalPathway(patientData.queueType, patientData.gender)
          
          // حفظ المسار الجديد في Backend
          try {
            await api.createRoute(
              patientData.id,
              patientData.queueType,
              patientData.gender,
              examStations
            )
            console.log('✅ Saved new route to backend')
          } catch (err) {
            console.error('❌ Failed to save route:', err)
          }
        }
        
        // الدخول التلقائي للعيادة الأولى
        const initialStations = examStations.map((station, index) => ({
          ...station,
          status: index === 0 ? 'ready' : 'locked',
          current: 0,
          yourNumber: 0,
          ahead: 0,
          isEntered: false
        }))
        
        setStations(initialStations)
        
        // دخول تلقائي للعيادة الأولى
        if (examStations.length > 0) {
          const firstClinic = examStations[0]
          await handleAutoEnterFirstClinic(firstClinic)
          
          // إشعار الطابق عند البداية
          if (firstClinic.floor) {
            setCurrentNotice({
              type: 'floor_guide',
              message: `📍 يرجى التوجه إلى ${firstClinic.floor}`,
              clinic: firstClinic.nameAr
            })
            setTimeout(() => setCurrentNotice(null), 8000)
          }
        }
      } catch (err) {
        console.error('Failed to load pathway:', err)
      }
    }
    
    loadPathway()
  }, [patientData.queueType, patientData.gender])

  // دخول تلقائي للعيادة الأولى
  const handleAutoEnterFirstClinic = async (station) => {
    try {
      const res = await api.enterQueue(station.id, patientData.id, true)
      const ticket = res?.display_number || res?.number || 1
      
      setActiveTicket({ clinicId: station.id, ticket })
      setStations(prev => prev.map((s, idx) => idx === 0 ? {
        ...s,
        current: res?.current || 0,
        yourNumber: ticket,
        ahead: res?.ahead || 0,
        status: 'ready',
        isEntered: true
      } : s))
    } catch (e) {
      console.error('Auto-enter first clinic failed:', e)
      // في حالة الفشل، نعطي رقم دور افتراضي
      setStations(prev => prev.map((s, idx) => idx === 0 ? {
        ...s,
        yourNumber: 1,
        status: 'ready',
        isEntered: true
      } : s))
    }
  }

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
    
    const url = `/api/v1/events/stream?user=${patientData.id}`;
    const eventSource = new EventSource(url);
    
    eventSource.addEventListener('queue_update', (e) => {
      try {
        const data = JSON.parse(e.data);
        const message = language === 'ar' ? data.message : data.messageEn;
        
        setCurrentNotice({
          type: data.type,
          message,
          position: data.position,
          clinic: data.clinic
        });
        
        enhancedApi.playNotificationSound();
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

  // الخروج من العيادة باستخدام رقم البن كود
  const handleClinicExit = async (station) => {
    try {
      setLoading(true)
      
      // التحقق من رقم البن كود
      const dailyPin = clinicPins[station.id]
      if (!dailyPin) {
        alert(language === 'ar' ? 'خطأ: رقم البن كود غير متوفر' : 'Error: PIN code not available')
        return
      }
      
      if (!pinInput || String(pinInput).trim() !== String(dailyPin)) {
        alert(language === 'ar' ? 'رقم البن كود غير صحيح' : 'Incorrect PIN code')
        return
      }

      // استدعاء API للخروج
      await api.clinicExit(patientData.id, station.id, pinInput)

      // تحديد العيادة التالية
      const currentIdx = stations.findIndex(s => s.id === station.id)
      const hasNextClinic = currentIdx >= 0 && currentIdx + 1 < stations.length
      
      // إذا كانت هناك عيادة تالية، ندخلها تلقائياً
      if (hasNextClinic) {
        const nextClinicId = stations[currentIdx + 1].id
        
        try {
          // دخول تلقائي للعيادة التالية
          const enterRes = await api.enterQueue(nextClinicId, patientData.id, true)
          const nextTicket = enterRes?.display_number || enterRes?.number || 1
          
          // تحديث جميع العيادات دفعة واحدة
          setStations(prev => prev.map((s, i) => {
            if (i === currentIdx) {
              // العيادة الحالية - مكتملة
              return { ...s, status: 'completed', exitTime: new Date() }
            } else if (i === currentIdx + 1) {
              // العيادة التالية - جاهزة ومفتوحة
              return {
                ...s,
                status: 'ready',
                current: enterRes?.current || 0,
                yourNumber: nextTicket,
                ahead: enterRes?.ahead || 0,
                isEntered: true
              }
            }
            return s
          }))
          
          setActiveTicket({ clinicId: nextClinicId, ticket: nextTicket })
          
          // إطلاق إشعار "حان دورك" للعيادة التالية
          const nextClinicName = stations[currentIdx + 1]?.name || 'العيادة التالية'
          eventBus.emit('queue:your_turn', {
            patientId: patientData.id,
            clinicName: nextClinicName,
            number: nextTicket
          })
        } catch (err) {
          console.error('Failed to auto-enter next clinic:', err)
          // في حالة الفشل، نفتح العيادة بدون دخول
          setStations(prev => prev.map((s, i) => {
            if (i === currentIdx) {
              return { ...s, status: 'completed', exitTime: new Date() }
            } else if (i === currentIdx + 1) {
              return { ...s, status: 'ready', yourNumber: 1, isEntered: true }
            }
            return s
          }))
        }
      } else {
        // لا توجد عيادة تالية - فقط نكمل العيادة الحالية
        setStations(prev => prev.map((s, i) => 
          i === currentIdx ? { ...s, status: 'completed', exitTime: new Date() } : s
        ))
      }

      setPinInput('')
      setSelectedStation(null)

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

  // If all completed, show completion screen
  if (allStationsCompleted) {
    return (
      <div className="min-h-screen p-4 flex items-center justify-center" data-test="completion-screen">
        <div className="max-w-2xl mx-auto space-y-6 text-center">
          <img src="/logo.jpeg" alt="قيادة الخدمات الطبية" className="mx-auto w-32 h-32 object-contain rounded-full shadow-lg" />

          <div className="text-green-400">
            <svg className="w-24 h-24 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>

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
      {currentNotice && (
        <ZFDBanner
          notice={currentNotice}
          onDismiss={() => setCurrentNotice(null)}
        />
      )}

      <NotificationSystem
        patientId={patientData?.id}
        currentClinic={stations.find(s => s.status === 'active' || s.status === 'ready')}
        yourNumber={stations.find(s => s.status === 'active' || s.status === 'ready')?.yourNumber}
        currentServing={stations.find(s => s.status === 'active' || s.status === 'ready')?.current}
        allStationsCompleted={allStationsCompleted}
      />

      <div className="max-w-4xl mx-auto space-y-6">
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
                      ) : station.status === 'completed' ? (
                        <Lock className="icon icon-lg icon-primary" />
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
                      <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                        station.status === 'ready' ? 'bg-green-500/20 text-green-400' :
                        station.status === 'completed' ? 'bg-blue-500/20 text-blue-400' :
                        'bg-gray-500/20 text-gray-400'
                      }`}>
                        {station.status === 'ready' ? t('ready', language) :
                          station.status === 'completed' ? t('completed', language) :
                          t('locked', language)}
                      </span>
                    </div>
                  </div>

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

                  {station.status === 'ready' && station.isEntered && (
                    <div className="mt-4 pt-4 border-t border-gray-600 space-y-3">
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

        <div className="text-center">
          <Button variant="outline" onClick={onLogout} className="border-gray-600 text-gray-300">
            {t('exitSystem', language)}
          </Button>
        </div>
      </div>
    </div>
  )
}


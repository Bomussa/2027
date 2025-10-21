import React, { useState, useEffect, useRef } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from './Card'
import { Button } from './Button'
import { Input } from './Input'
import { Lock, Unlock, Clock, Globe } from 'lucide-react'
import { getMedicalPathway, calculateWaitTime, examTypes } from '../lib/utils'
import { t } from '../lib/i18n'
import api from '../lib/api'

export function PatientPage({ patientData, onLogout, language, toggleLanguage }) {
  const [stations, setStations] = useState([])
  const [pinInput, setPinInput] = useState('')
  const [selectedStation, setSelectedStation] = useState(null)
  const [loading, setLoading] = useState(false)
  const [queueStatus, setQueueStatus] = useState(null)
  const eventSourceRef = useRef(null)

  useEffect(() => {
    // Get stations for the patient's exam type and gender
    const examStations = getMedicalPathway(patientData.queueType, patientData.gender)
    setStations(examStations.map((station, index) => ({
      ...station,
      status: index === 0 ? 'ready' : 'locked',
      current: 0,
      yourNumber: index === 0 ? 1 : 0,
      ahead: 0
    })))

    // Connect to SSE for real-time updates
    connectToSSE()

    // Cleanup on unmount
    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close()
      }
    }
  }, [patientData.queueType, patientData.gender])

  const connectToSSE = () => {
    try {
      // Close existing connection if any
      if (eventSourceRef.current) {
        eventSourceRef.current.close()
      }

      // Use the clinic from queueType and user from patientId
      const clinic = patientData.queueType || 'general'
      const user = patientData.patientId || patientData.id

      const eventSource = api.connectEventSource(clinic, user)
      eventSourceRef.current = eventSource

      eventSource.addEventListener('message', (event) => {
        try {
          const data = JSON.parse(event.data)
          console.log('SSE Event:', data)
          
          // Update queue status based on event type
          switch (data.type) {
            case 'CONNECTED':
              console.log('Connected to SSE stream')
              break
            
            case 'YOUR_TURN':
              // It's the patient's turn
              setQueueStatus({
                type: 'YOUR_TURN',
                message: language === 'ar' ? 'حان دورك! توجه إلى العيادة' : "It's your turn! Go to the clinic",
                current: data.current,
                yourNumber: data.number
              })
              break
            
            case 'NEAR_TURN':
              // Patient is near their turn (1-2 ahead)
              setQueueStatus({
                type: 'NEAR_TURN',
                message: language === 'ar' ? `قريباً دورك - ${data.ahead} شخص أمامك` : `Almost your turn - ${data.ahead} ahead`,
                current: data.current,
                yourNumber: data.number,
                ahead: data.ahead
              })
              break
            
            case 'STEP_DONE_NEXT':
              // Current step is done, move to next
              setQueueStatus({
                type: 'STEP_DONE_NEXT',
                message: language === 'ar' ? 'تم إنهاء المرحلة، انتقل للمرحلة التالية' : 'Step completed, move to next step',
                status: data.status
              })
              break
            
            case 'QUEUE_UPDATE':
              // General queue update
              updateStationsWithQueueData(data)
              break
            
            default:
              console.log('Unknown event type:', data.type)
          }
        } catch (error) {
          console.error('Error parsing SSE data:', error)
        }
      })

      eventSource.addEventListener('error', (error) => {
        console.error('SSE Connection error:', error)
        // Will auto-reconnect via api.js
      })

    } catch (error) {
      console.error('Error connecting to SSE:', error)
    }
  }

  const updateStationsWithQueueData = (data) => {
    // Update stations with real-time queue data
    setStations(prev => prev.map((station, index) => {
      if (index === 0) {
        return {
          ...station,
          current: data.current || 0,
          ahead: Math.max(0, (station.yourNumber || 1) - (data.current || 0))
        }
      }
      return station
    }))
  }

  const handleUnlock = async () => {
    if (!selectedStation || !pinInput.trim()) return

    setLoading(true)
    try {
      await api.unlockStation(patientData.id, selectedStation.id, pinInput)
      // Update station status
      setStations(prev => prev.map(station => 
        station.id === selectedStation.id 
          ? { ...station, status: 'ready', yourNumber: station.current + 1 }
          : station
      ))
      setPinInput('')
      setSelectedStation(null)
    } catch (error) {
      console.error('Unlock error:', error)
      alert(language === 'ar' ? 'رقم PIN غير صحيح' : 'Invalid PIN')
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
            <Globe className="w-4 h-4 mr-2" />
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

        {/* Queue Status Alert */}
        {queueStatus && (
          <Card className={`border-2 ${
            queueStatus.type === 'YOUR_TURN' ? 'bg-green-500/20 border-green-500' :
            queueStatus.type === 'NEAR_TURN' ? 'bg-yellow-500/20 border-yellow-500' :
            'bg-blue-500/20 border-blue-500'
          }`}>
            <CardContent className="p-4">
              <p className="text-white text-center font-semibold text-lg">
                {queueStatus.message}
              </p>
            </CardContent>
          </Card>
        )}

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
                        <Unlock className="w-6 h-6 text-green-400" />
                      ) : (
                        <Lock className="w-6 h-6 text-gray-400" />
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

                  {station.status === 'locked' && (
                    <div className="mt-4 pt-4 border-t border-gray-600">
                      <div className="flex gap-2">
                        <Input
                          type="text"
                          placeholder={t('enterPIN', language)}
                          value={selectedStation?.id === station.id ? pinInput : ''}
                          onChange={(e) => {
                            setSelectedStation(station)
                            setPinInput(e.target.value)
                          }}
                          className="bg-gray-600 border-gray-500 text-white"
                          maxLength={2}
                        />
                        <Button
                          variant="gradientSecondary"
                          onClick={handleUnlock}
                          disabled={loading || !pinInput.trim() || selectedStation?.id !== station.id}
                        >
                          {t('unlock', language)}
                        </Button>
                      </div>
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


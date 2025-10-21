import React, { useState, useEffect } from 'react'
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
  }, [patientData.queueType, patientData.gender])

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

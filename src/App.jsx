import React, { useState, useEffect } from 'react'
import { LoginPage } from './components/LoginPage'
import { ExamSelectionPage } from './components/ExamSelectionPage'
import { PatientPage } from './components/PatientPage'
import { AdminPage } from './components/AdminPage'
import api from './lib/api'
import './core/notification-engine.js'

import { themes } from './lib/utils'
import { t, getCurrentLanguage, setCurrentLanguage } from './lib/i18n'

function App() {
  const [currentView, setCurrentView] = useState("login")
  const [patientData, setPatientData] = useState(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [currentTheme, setCurrentTheme] = useState(themes[0].id) // Default to the first theme
  const [language, setLanguage] = useState(getCurrentLanguage())

  useEffect(() => {
    // Set initial language and direction
    setCurrentLanguage(language)

    // Check URL for admin access
    if (window.location.pathname.includes('/admin') || window.location.search.includes('admin=true')) {
      setCurrentView('admin')
      setIsAdmin(true)
    }
  }, [language])

  const handleLogin = async ({ patientId, gender }) => {
    try {
      const data = await api.enterQueue({ patientId, gender })
      setPatientData(data)
      setCurrentView("examSelection")
    } catch (error) {
      console.error("Login failed:", error)
      alert(t('loginFailed', language))
    }
  }

  const handleExamSelection = async (examType) => {
    try {
      const updatedData = await api.selectExam(patientData.id, examType)
      setPatientData({ ...patientData, queueType: examType, ...updatedData })
      setCurrentView('patient')
    } catch (error) {
      console.error('Exam selection failed:', error)
      alert(t('examSelected', language))
    }
  }

  const handleAdminLogin = (code) => {
    if (code === 'BOMUSSA14490') {
      setIsAdmin(true)
      setCurrentView('admin')
    } else {
      alert(t('invalidPIN', language))
    }
  }

  const handleLogout = () => {
    setPatientData(null)
    setIsAdmin(false)
    setCurrentView('login')
    // Clear URL parameters
    window.history.pushState({}, '', window.location.pathname)
  }

  const toggleLanguage = () => {
    const newLang = language === 'ar' ? 'en' : 'ar'
    setLanguage(newLang)
    setCurrentLanguage(newLang)
  }

  return (
    <div className={`min-h-screen theme-${currentTheme}`}>
      {currentView === 'login' && (
        <LoginPage 
          onLogin={handleLogin}
          onAdminLogin={handleAdminLogin}
          currentTheme={currentTheme}
          onThemeChange={setCurrentTheme}
          language={language}
          toggleLanguage={toggleLanguage}
        />
      )}
      
      {currentView === 'examSelection' && patientData && (
        <ExamSelectionPage 
          patientData={patientData}
          onExamSelect={handleExamSelection}
          onBack={() => setCurrentView('login')}
          language={language}
          toggleLanguage={toggleLanguage}
        />
      )}
      
      {currentView === 'patient' && patientData && (
        <PatientPage 
          patientData={patientData}
          onLogout={handleLogout}
          language={language}
          toggleLanguage={toggleLanguage}
        />
      )}
      
      {currentView === 'admin' && isAdmin && (
        <AdminPage 
          onLogout={handleLogout}
          language={language}
          toggleLanguage={toggleLanguage}
        />
      )}
    </div>
  )
}

export default App

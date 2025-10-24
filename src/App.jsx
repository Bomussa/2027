// Ensure notification listeners are active globally
import './core/notification-engine.js';
import React, { useState, useEffect } from 'react'
import { LoginPage } from './components/LoginPage'
import { ExamSelectionPage } from './components/ExamSelectionPage'
import { PatientPage } from './components/PatientPage'
import { AdminPage } from './components/AdminPage'
import { QrScanPage } from './components/QrScanPage'
import EnhancedThemeSelector from './components/EnhancedThemeSelector'
import api from './lib/api'
import enhancedApi from './lib/enhanced-api'

import { themes, medicalPathways } from './lib/utils'
import { enhancedMedicalThemes, generateThemeCSS } from './lib/enhanced-themes'
import { t, getCurrentLanguage, setCurrentLanguage } from './lib/i18n'

function App() {
  const [currentView, setCurrentView] = useState("login")
  const [patientData, setPatientData] = useState(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [currentTheme, setCurrentTheme] = useState(() => localStorage.getItem('selectedTheme') || 'medical-professional') // استخدام الثيم الطبي الاحترافي كافتراضي
  const [language, setLanguage] = useState(getCurrentLanguage())
  const [showThemeSelector, setShowThemeSelector] = useState(false)
  const [themeSettings, setThemeSettings] = useState({
    enableThemeSelector: true,
    showThemePreview: true
  })
  const [notif, setNotif] = useState(null)

  useEffect(() => {
    // Set initial language and direction
    setCurrentLanguage(language)

    // Check URL for QR scan
    if (window.location.pathname.includes('/qr') || window.location.search.includes('token=')) {
      setCurrentView('qrscan')
      return
    }

    // Check URL for admin access
    if (window.location.pathname.includes('/admin') || window.location.search.includes('admin=true')) {
      setCurrentView('admin')
      setIsAdmin(true)
    }
  }, [language])

  // SSE notifications handled by notification-engine.js
  // No need for duplicate EventSource here

  // تطبيق الثيم عند تغييره
  useEffect(() => {
    applyTheme(currentTheme)
    try { localStorage.setItem('selectedTheme', currentTheme) } catch (e) { }
  }, [currentTheme])

  const applyTheme = (themeId) => {
    const theme = enhancedMedicalThemes.find(t => t.id === themeId)
    if (!theme) return

    const themeCSS = generateThemeCSS(themeId)

    // Applying theme

    // إزالة الثيم السابق
    const existingStyle = document.getElementById('enhanced-theme-style')
    if (existingStyle) {
      existingStyle.remove()
    }

    // إضافة الثيم الجديد
    const style = document.createElement('style')
    style.id = 'enhanced-theme-style'
    style.textContent = themeCSS
    document.head.appendChild(style)

    // تطبيق الخلفية من الثيم على body
    document.body.style.background = theme.gradients.background
    document.body.className = `theme-${themeId}`

    // Theme applied successfully
  }

  const handleThemeChange = (themeId) => {
    setCurrentTheme(themeId)
  }

  const showNotification = (message, type = 'info') => {
    // إنشاء إشعار مؤقت
    const notification = document.createElement('div')
    notification.className = `
      fixed top-4 right-4 z-50 p-4 rounded-lg shadow-lg transition-all duration-300
      ${type === 'success' ? 'bg-green-500 text-white' :
        type === 'error' ? 'bg-red-500 text-white' :
          'bg-blue-500 text-white'}
    `
    notification.textContent = message

    document.body.appendChild(notification)

    setTimeout(() => {
      notification.style.opacity = '0'
      setTimeout(() => {
        if (document.body.contains(notification)) {
          document.body.removeChild(notification)
        }
      }, 300)
    }, 3000)
  }

  const handleLogin = async ({ patientId, gender }) => {
    try {
      // First login the patient
      const loginResponse = await api.patientLogin(patientId, gender)
      
      console.log('Login response:', loginResponse) // للتشخيص
      
      if (loginResponse.success) {
        // تحويل الـ Response لتتناسب مع البنية المتوقعة
        // Backend يرجع البيانات مباشرة بدون data wrapper
        const sessionData = {
          id: loginResponse.patientId || patientId, // استخدام patientId كـ id
          patientId: loginResponse.patientId || patientId,
          gender: loginResponse.gender || gender,
          examType: loginResponse.examType || 'recruitment',
          route: loginResponse.route || [],
          first_clinic: loginResponse.first_clinic,
          queue_number: loginResponse.queue_number,
          waiting_count: loginResponse.waiting_count,
          total_clinics: loginResponse.total_clinics,
          loginTime: new Date().toISOString(),
          status: 'logged_in'
        }
        
        setPatientData(sessionData)
        setCurrentView("examSelection")
        
        showNotification(
          language === 'ar' ? 'تم تسجيل الدخول بنجاح' : 'Login successful',
          'success'
        )
      } else {
        throw new Error(loginResponse.error || 'Login failed')
      }
    } catch (error) {
      console.error('Login error:', error) // للتشخيص
      // Login failed - show notification
      showNotification(
        language === 'ar' ? 'فشل تسجيل الدخول' : 'Login failed',
        'error'
      )
    }
  }

  const handleExamSelection = async (examType) => {
    try {
      console.log('Exam selection:', examType, 'Patient data:', patientData) // للتشخيص
      
      // التحقق من وجود patientData
      if (!patientData || !patientData.id) {
        throw new Error('Patient data is missing')
      }
      
      // Get first clinic from medical pathway based on exam type and gender
      const pathway = medicalPathways[examType]?.[patientData.gender] || []
      
      // إذا كان المريض لديه route من Backend، استخدمه
      const clinicRoute = patientData.route && patientData.route.length > 0 
        ? patientData.route 
        : pathway.map(c => c.id)
      
      if (clinicRoute.length === 0) {
        throw new Error('No clinics found for this exam type')
      }
      
      // استخدام current_clinic من Backend (للمرضى الموجودين) أو first_clinic (للمرضى الجدد)
      // Backend يحدد العيادة الحالية بناءً على clinic loads و patient progress
      const targetClinic = patientData.current_clinic || patientData.first_clinic || clinicRoute[0]
      
      console.log('Target clinic:', targetClinic, 'Route:', clinicRoute) // للتشخيص
      
      // إذا كان المريض لديه queue_number من Backend (تم auto-enter)، لا حاجة للدخول مرة أخرى
      let queueData;
      
      if (patientData.queue_number) {
        // المريض موجود بالفعل في الـ queue (من auto-enter)
        console.log('Patient already in queue with number:', patientData.queue_number)
        queueData = {
          success: true,
          number: patientData.queue_number,
          display_number: patientData.queue_number,
          ahead: patientData.waiting_count || 0
        }
      } else {
        // دخول العيادة لأول مرة
        queueData = await api.enterQueue(targetClinic, patientData.id, false)
        
        if (!queueData || !queueData.success) {
          throw new Error(queueData?.error || 'Failed to enter queue')
        }
      }
      
      // Update patient data with queue information
      const updatedPatientData = {
        ...patientData,
        queueType: examType,
        currentClinic: targetClinic,
        queueNumber: queueData.display_number || queueData.number,
        ahead: queueData.ahead || 0,
        pathway: pathway.length > 0 ? pathway : clinicRoute.map(id => ({ id }))
      }
      
      console.log('Updated patient data:', updatedPatientData) // للتشخيص
      
      setPatientData(updatedPatientData)
      setCurrentView('patient')
      
      showNotification(
        language === 'ar' ? 'تم التسجيل بنجاح في قائمة الانتظار' : 'Successfully registered in queue',
        'success'
      )
    } catch (error) {
      console.error('Exam selection failed:', error)
      showNotification(
        language === 'ar' ? 'فشل التسجيل في قائمة الانتظار' : 'Failed to register in queue',
        'error'
      )
    }
  }

  const handleAdminLogin = async (credentials) => {
    // credentials format: "username:password"
    const [username, password] = credentials.split(':')
    
    // التحقق من بيانات الدخول الجديدة (admin/BOMUSSA14490)
    if (username === 'admin' && password === 'BOMUSSA14490') {
      setIsAdmin(true)
      setCurrentView('admin')
      return
    }

    try {
      const formData = new URLSearchParams()
      formData.append('username', username)
      formData.append('password', password)

      const response = await fetch('/admin/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: formData.toString(),
        credentials: 'include',
        redirect: 'follow'
      })

      // التحقق من النجاح: إذا وصل للـ dashboard أو status 200
      const finalUrl = response.url
      if (response.ok || finalUrl.includes('/admin/dashboard') || finalUrl.includes('/admin')) {
        setIsAdmin(true)
        setCurrentView('admin')
        return
      }

      // إذا فشل
      alert(language === 'ar' ? 'بيانات الدخول غير صحيحة' : 'Invalid credentials')
    } catch (error) {
      // Admin login error
      alert(language === 'ar' ? 'حدث خطأ في تسجيل الدخول' : 'Login error')
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
    <div className="min-h-screen"
      style={{
        background: enhancedMedicalThemes.find(t => t.id === currentTheme)?.gradients?.background || '#0b0b0f'
      }}
    >

      {/* المحتوى الرئيسي */}
      <main className="relative z-10">
        {currentView === 'qrscan' && (
          <QrScanPage
            language={language}
            toggleLanguage={toggleLanguage}
          />
        )}

        {currentView === 'login' && (
          <LoginPage
            onLogin={handleLogin}
            onAdminLogin={handleAdminLogin}
            currentTheme={currentTheme}
            onThemeChange={handleThemeChange}
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
            currentTheme={currentTheme}
            onThemeChange={handleThemeChange}
          />
        )}
      </main>

    </div>
  )
}

export default App

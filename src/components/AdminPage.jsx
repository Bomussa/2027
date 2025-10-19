import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from './Card'
import { Button } from './Button'
import { Input } from './Input'
import { EnhancedAdminDashboard } from './EnhancedAdminDashboard'
import { ClinicsConfiguration } from './ClinicsConfiguration'
import {
  BarChart3,
  Users,
  Settings,
  FileText,
  Lock,
  Home,
  LogOut,
  Clock,
  CheckCircle,
  Activity,
  Download,
  RefreshCw,
  Play,
  Pause,
  Globe
} from 'lucide-react'
import { themes } from '../lib/utils'
import { enhancedMedicalThemes } from '../lib/enhanced-themes'
import { t } from '../lib/i18n'
import api from '../lib/api'

export function AdminPage({ onLogout, language, toggleLanguage, currentTheme, onThemeChange }) {
  const [currentView, setCurrentView] = useState('dashboard')
  const [stats, setStats] = useState(null)
  const [activePins, setActivePins] = useState([])
  const [loading, setLoading] = useState(false)
  const [adminCode] = useState('BOMUSSA14490')
  const [queues, setQueues] = useState([])
  const [recentReports, setRecentReports] = useState([])

  useEffect(() => {
    loadStats()
    loadActivePins()
    loadQueues()
    loadRecentReports()
    const interval = setInterval(() => {
      loadStats()
      loadActivePins()
      loadQueues()
      loadRecentReports()
    }, 5000)
    return () => clearInterval(interval)
  }, [])

  const loadQueues = async () => {
    try {
      const data = await api.getQueues()
      if (data && Array.isArray(data)) {
        setQueues(data)
      }
    } catch (error) {
      console.error('Failed to load queues:', error)
      // Use fallback empty array
      setQueues([])
    }
  }

  const loadStats = async () => {
    try {
      const data = await api.getQueueStats()
      setStats(data)
    } catch (error) {
      console.error('Failed to load stats:', error)
    }
  }

  const loadActivePins = async () => {
    try {
      const data = await api.getActivePins(adminCode)
      setActivePins(data.pins || [])
    } catch (error) {
      console.error('Failed to load pins:', error)
    }
  }

  const loadRecentReports = async () => {
    try {
      const data = await api.getRecentReports(adminCode)
      setRecentReports(data.reports || [])
    } catch (error) {
      console.error('Failed to load recent reports:', error)
      setRecentReports([])
    }
  }

  const handleCallNext = async (queueType) => {
    setLoading(true)
    try {
      await api.callNextPatient(queueType, adminCode)
      await loadStats()
    } catch (error) {
      console.error('Failed to call next patient:', error)
    } finally {
      setLoading(false)
    }
  }

  const handlePauseQueue = async (queueType) => {
    setLoading(true)
    try {
      await api.pauseQueue(queueType, adminCode)
      await loadStats()
    } catch (error) {
      console.error('Failed to pause queue:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleGeneratePin = async (stationId) => {
    setLoading(true)
    try {
      await api.generatePIN(stationId, adminCode)
      await loadActivePins()
    } catch (error) {
      console.error('Failed to generate PIN:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleDeactivatePin = async (pinId) => {
    setLoading(true)
    try {
      await api.deactivatePIN(pinId, adminCode)
      await loadActivePins()
    } catch (error) {
      console.error('Failed to deactivate PIN:', error)
    } finally {
      setLoading(false)
    }
  }

  const renderSidebar = () => (
    <div className="w-64 bg-gray-800/50 border-r border-gray-700 p-4 z-10">
      <div className="flex items-center gap-3 mb-8">
        <div className="w-10 h-10 bg-gradient-to-br from-red-500 to-yellow-500 rounded-full flex items-center justify-center">
          <span className="text-white font-bold">⚕️</span>
        </div>
        <div>
          <h2 className="text-white font-semibold">Admin Dashboard</h2>
          <p className="text-gray-400 text-sm">Welcome admin</p>
        </div>
      </div>

      <nav className="space-y-2">
        <Button
          variant={currentView === 'dashboard' ? 'secondary' : 'ghost'}
          className="w-full justify-start"
          onClick={() => setCurrentView('dashboard')}
        >
          <BarChart3 className="icon icon-md me-3" />
          لوحة التحكم
        </Button>
        <Button
          variant={currentView === 'enhanced' ? 'secondary' : 'ghost'}
          className="w-full justify-start"
          onClick={() => setCurrentView('enhanced')}
        >
          <Activity className="icon icon-md me-3" />
          لوحة التحكم المحسنة
        </Button>
        <Button
          variant={currentView === 'queues' ? 'secondary' : 'ghost'}
          className="w-full justify-start"
          onClick={() => setCurrentView('queues')}
        >
          <Users className="icon icon-md me-3" />
          إدارة الطوابير
        </Button>
        <Button
          variant={currentView === 'pins' ? 'secondary' : 'ghost'}
          className="w-full justify-start"
          onClick={() => setCurrentView('pins')}
        >
          <Lock className="icon icon-md me-3" />
          إدارة الأرقام السرية
        </Button>
        <Button
          variant={currentView === 'reports' ? 'secondary' : 'ghost'}
          className="w-full justify-start"
          onClick={() => setCurrentView('reports')}
        >
          <FileText className="icon icon-md me-3" />
          التقارير
        </Button>
        <Button
          variant={currentView === 'clinics' ? 'secondary' : 'ghost'}
          className="w-full justify-start"
          onClick={() => setCurrentView('clinics')}
        >
          <Settings className="icon icon-md me-3" />
          تكوين العيادات
        </Button>
        <Button
          variant={currentView === 'settings' ? 'secondary' : 'ghost'}
          className="w-full justify-start"
          onClick={() => setCurrentView('settings')}
        >
          <Settings className="icon icon-md me-3" />
          الإعدادات
        </Button>
      </nav>
    </div>
  )

  const renderDashboard = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">لوحة التحكم</h1>
        <Button variant="outline" onClick={loadStats} disabled={loading}>
          <RefreshCw className="icon icon-md me-2" />
          تحديث
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="bg-gray-800/50 border-gray-700">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">إجمالي المنتظرين</p>
                <p className="text-3xl font-bold text-white">{stats?.stats?.totalWaiting || 0}</p>
              </div>
              <Users className="icon icon-xl text-blue-400" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gray-800/50 border-gray-700">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">الطوابير النشطة</p>
                <p className="text-3xl font-bold text-white">{stats?.stats?.activeQueues || 0}</p>
              </div>
              <Activity className="icon icon-xl text-green-400" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gray-800/50 border-gray-700">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">الفحوص المكتملة</p>
                <p className="text-3xl font-bold text-white">{stats?.stats?.completedToday || 0}</p>
              </div>
              <CheckCircle className="icon icon-xl text-purple-400" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gray-800/50 border-gray-700">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">متوسط الانتظار (دقيقة)</p>
                <p className="text-3xl font-bold text-white">{stats?.stats?.avgWaitTime || 0}</p>
              </div>
              <Clock className="icon icon-xl text-yellow-400" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Live Queue Status */}
      <Card className="bg-gray-800/50 border-gray-700">
        <CardHeader>
          <CardTitle className="text-white">حالة الطوابير الحية</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {queues.length === 0 ? (
            <div className="text-center text-gray-400 py-8">
              {language === 'ar' ? 'لا توجد طوابير نشطة' : 'No active queues'}
            </div>
          ) : (
            queues.map((queue, index) => (
              <div key={queue.id || index} className="flex items-center justify-between p-4 bg-gray-700/50 rounded-lg">
                <div>
                  <h3 className="text-white font-semibold">{queue.name || queue.nameAr}</h3>
                  <p className="text-gray-400 text-sm">
                    الرقم الحالي: {queue.current || 0} | في الانتظار: {queue.waiting || 0}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-white font-semibold">{queue.avgTime ? `${queue.avgTime} دقيقة` : '-'}</p>
                  <p className="text-gray-400 text-sm">متوسط الوقت</p>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  )

  const renderQueues = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">إدارة الطوابير</h1>
        <Button variant="outline" onClick={loadStats}>
          <RefreshCw className="icon icon-md me-2" />
          تحديث
        </Button>
      </div>

      <div className="space-y-4">
        {queues.length === 0 ? (
          <div className="text-center text-gray-400 py-8">
            {language === 'ar' ? 'لا توجد طوابير للإدارة' : 'No queues to manage'}
          </div>
        ) : (
          queues.map((queue) => (
            <Card key={queue.id} className="bg-gray-800/50 border-gray-700">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <h3 className="text-white font-semibold text-lg mb-2">{queue.name || queue.nameAr}</h3>
                      <div className="grid grid-cols-3 gap-4 text-center">
                      <div>
                        <p className="text-2xl font-bold text-white">{queue.current || 0}</p>
                        <p className="text-gray-400 text-sm">الرقم الحالي</p>
                      </div>
                      <div>
                        <p className="text-2xl font-bold text-yellow-400">{queue.waiting || 0}</p>
                        <p className="text-gray-400 text-sm">في الانتظار</p>
                      </div>
                      <div>
                        <p className="text-2xl font-bold text-white">{queue.avgTime || 0}</p>
                        <p className="text-gray-400 text-sm">متوسط الوقت (دقيقة)</p>
                      </div>
                    </div>
                  </div>
                      <div className="flex flex-col gap-2 ml-4">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleCallNext(queue.id)}
                      disabled={loading || !queue.waiting}
                      className="border-yellow-500 text-yellow-400 hover:bg-yellow-500/10"
                    >
                      استدعاء التالي
                    </Button>
                    <Button
                      variant="gradientSecondary"
                      size="sm"
                      onClick={() => handlePauseQueue(queue.id)}
                      disabled={loading}
                    >
                      إيقاف مؤقت
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  )

  const renderPins = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">إدارة أكواد PIN</h1>
        <div className="flex gap-2">
          <Button variant="gradient" onClick={() => handleGeneratePin('lab')}>
            + إضافة PIN
          </Button>
          <Button variant="gradientSecondary" onClick={loadActivePins}>
            تحديث الكل
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-6">
        <Card className="bg-gray-800/50 border-gray-700">
          <CardContent className="p-6 text-center">
            <p className="text-3xl font-bold text-white">{activePins.length || 0}</p>
            <p className="text-gray-400 text-sm whitespace-nowrap">أكواد نشطة</p>
          </CardContent>
        </Card>
        <Card className="bg-gray-800/50 border-gray-700">
          <CardContent className="p-6 text-center">
            <p className="text-3xl font-bold text-white">{activePins.filter(p => p.status === 'used').length || 0}</p>
            <p className="text-gray-400 text-sm whitespace-nowrap">مستخدمة</p>
          </CardContent>
        </Card>
        <Card className="bg-gray-800/50 border-gray-700">
          <CardContent className="p-6 text-center">
            <p className="text-3xl font-bold text-white">{activePins.filter(p => p.status === 'active').length || 0}</p>
            <p className="text-gray-400 text-sm whitespace-nowrap">متاحة</p>
          </CardContent>
        </Card>
      </div>

      {/* Active PINs */}
      <Card className="bg-gray-800/50 border-gray-700">
        <CardHeader>
          <CardTitle className="text-white">الأكواد النشطة</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {activePins.length === 0 ? (
            <div className="text-center text-gray-400 py-8">
              {language === 'ar' ? 'لا توجد أكواد نشطة' : 'No active PINs'}
            </div>
          ) : (
            activePins.map((pin) => (
              <div key={pin.id} className="flex items-center justify-between p-4 bg-gray-700/50 rounded-lg">
                <div className="flex items-center gap-4">
                  <div className="text-2xl font-bold text-white">{pin.pin || pin.id}</div>
                  <div>
                    <p className="text-white font-semibold">{pin.clinicId || pin.code || 'N/A'}</p>
                    <p className="text-gray-400 text-sm">{pin.status === 'active' ? 'نشط' : 'مستخدم'}</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="gradientSecondary"
                    size="sm"
                    onClick={() => handleDeactivatePin(pin.id)}
                    disabled={loading}
                  >
                    إلغاء تفعيل
                  </Button>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  )

  const renderReports = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">إنشاء التقارير</h1>
        <Button variant="outline" className="border-yellow-500 text-yellow-400">
          خط الإنتاجات
        </Button>
      </div>

      {/* Report Types */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        <Card className="bg-gray-800/50 border-gray-700">
          <CardHeader>
            <CardTitle className="text-white text-lg">تقارير يومية</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button variant="gradient" className="w-full justify-start gap-2 text-xs">
              <FileText className="w-4 h-4 flex-shrink-0" />
              <span>تقرير يومي PDF</span>
            </Button>
            <Button variant="gradientSecondary" className="w-full justify-start gap-2 text-xs">
              <FileText className="w-4 h-4 flex-shrink-0" />
              <span>تقرير يومي Excel</span>
            </Button>
          </CardContent>
        </Card>

        <Card className="bg-gray-800/50 border-gray-700">
          <CardHeader>
            <CardTitle className="text-white text-lg">تقارير أسبوعية</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button variant="gradient" className="w-full justify-start gap-2 text-xs">
              <BarChart3 className="w-4 h-4 flex-shrink-0" />
              <span>تقرير إجمالي أسبوعي</span>
            </Button>
            <Button variant="gradientSecondary" className="w-full justify-start gap-2 text-xs">
              <Activity className="w-4 h-4 flex-shrink-0" />
              <span>تقرير الأداء الأسبوعي</span>
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Recent Reports */}
      <Card className="bg-gray-800/50 border-gray-700">
        <CardHeader>
          <CardTitle className="text-white">التقارير الحديثة</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {recentReports.length === 0 ? (
            <div className="text-center text-gray-400 py-8">
              {t('noReports', language)}
            </div>
          ) : (
            recentReports.map((report, index) => (
              <div key={index} className="flex items-center justify-between p-4 bg-gray-700/50 rounded-lg">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <FileText className="w-5 h-5 text-gray-400 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-white font-medium truncate">{report.name}</p>
                    <p className="text-gray-400 text-sm">{report.size} - {report.date}</p>
                  </div>
                </div>
                <Button variant="outline" size="sm" className="border-yellow-500 text-yellow-400 flex-shrink-0 gap-2">
                  <Download className="w-4 h-4" />
                  <span>تحميل</span>
                </Button>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  )

  const renderSettings = () => {
    

    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-white">إعدادات النظام</h1>
        </div>

        {/* General Settings */}
        <Card className="bg-gray-800/50 border-gray-700">
          <CardHeader>
            <CardTitle className="text-white">إعدادات عامة</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-white">التحديث التلقائي</span>
              <div className="w-12 h-6 bg-green-500 rounded-full relative">
                <div className="w-5 h-5 bg-white rounded-full absolute top-0.5 right-0.5"></div>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-white">تفعيل الصوت</span>
              <div className="w-12 h-6 bg-green-500 rounded-full relative">
                <div className="w-5 h-5 bg-white rounded-full absolute top-0.5 right-0.5"></div>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-white">الإشعارات</span>
              <div className="w-12 h-6 bg-green-500 rounded-full relative">
                <div className="w-5 h-5 bg-white rounded-full absolute top-0.5 right-0.5"></div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Theme Settings */}
        <Card className="bg-gray-800/50 border-gray-700">
          <CardHeader>
            <CardTitle className="text-white">إعدادات المظهر</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {enhancedMedicalThemes.map((theme) => (
                <button
                  key={theme.id}
                  onClick={() => onThemeChange(theme.id)}
                  className={`p-2 rounded-lg text-sm font-medium transition-all border ${currentTheme === theme.id ? 'border-theme-primary ring-2 ring-theme-primary/50' : 'border-gray-700 hover:border-gray-500'}`}
                  style={{ background: theme.gradients.primary, color: 'white' }}
                >
                  {language === 'ar' ? theme.nameAr : theme.name}
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-900">
      {/* Top Header */}
      <header className="border-b border-gray-800 bg-gray-900/50 backdrop-blur-sm">
        <div className="flex items-center justify-between px-6 py-4">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <img src="/logo.jpeg" alt="قيادة الخدمات الطبية" className="w-12 h-12 rounded-full" />
              <div className="text-right">
                <h1 className="text-white font-semibold text-lg">قيادة الخدمات الطبية</h1>
                <p className="text-gray-400 text-sm">Medical Services</p>
              </div>
            </div>
          </div>

          <div className="text-center">
            <h2 className="text-white font-medium">Welcome to the Medical Committee System</h2>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" className="text-gray-300 hover:text-white">
              <Settings className="icon icon-md me-2" />
              Admin
            </Button>
            <Button variant="ghost" size="sm" className="text-gray-300 hover:text-white">
              English 🇺🇸
            </Button>
            <Button variant="ghost" size="sm" className="text-gray-300 hover:text-white">
              Night Shift
            </Button>
          </div>
        </div>
      </header>

      {/* Admin Header */}
      <div className="border-b border-gray-800 bg-gray-800/30">
        <div className="flex items-center justify-between px-6 py-3">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              className="text-gray-300 hover:text-white"
              onClick={toggleLanguage}
            >
              <Globe className="icon icon-md me-2" />
              {language === 'ar' ? 'English 🇺🇸' : 'العربية 🇶🇦'}
            </Button>
            <div className="w-10 h-10 bg-gradient-to-br from-red-500 to-yellow-500 rounded-full flex items-center justify-center">
              <span className="text-white font-bold">⚕️</span>
            </div>
            <div>
              <h2 className="text-white font-semibold">Admin Dashboard</h2>
              <p className="text-gray-400 text-sm">Welcome admin</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="border-yellow-500 text-yellow-400">
              <Home className="icon icon-md me-2" />
              Home
            </Button>
            <Button variant="gradientSecondary" size="sm" onClick={onLogout}>
              <LogOut className="icon icon-md me-2" />
              Logout
            </Button>
          </div>
        </div>
      </div>

      <div className="flex relative">
        {renderSidebar()}
        <main className="flex-1 p-6">
          {currentView === 'dashboard' && renderDashboard()}
          {currentView === 'enhanced' && (
            <EnhancedAdminDashboard
              language={language}
              onLogout={onLogout}
            />
          )}
          {currentView === 'queues' && renderQueues()}
          {currentView === 'pins' && renderPins()}
          {currentView === 'reports' && renderReports()}
          {currentView === 'clinics' && (
            <ClinicsConfiguration language={language} />
          )}
          {currentView === 'settings' && renderSettings()}
        </main>
      </div>
    </div>
  )
}

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
import { t } from '../lib/i18n'
import api from '../lib/api'

export function AdminPage({ onLogout, language, toggleLanguage }) {
  const [currentView, setCurrentView] = useState('dashboard')
  const [stats, setStats] = useState(null)
  const [activePins, setActivePins] = useState([])
  const [loading, setLoading] = useState(false)
  const [adminCode] = useState('BOMUSSA14490')

  useEffect(() => {
    loadStats()
    loadActivePins()
    const interval = setInterval(() => {
      loadStats()
      loadActivePins()
    }, 5000)
    return () => clearInterval(interval)
  }, [])

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
    <div className="w-64 bg-gray-800/50 border-r border-gray-700 p-4">
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
          <BarChart3 className="w-4 h-4 mr-3" />
          Dashboard
        </Button>
        <Button
          variant={currentView === 'enhanced' ? 'secondary' : 'ghost'}
          className="w-full justify-start"
          onClick={() => setCurrentView('enhanced')}
        >
          <Activity className="w-4 h-4 mr-3" />
          لوحة التحكم المحسنة
        </Button>
        <Button
          variant={currentView === 'queues' ? 'secondary' : 'ghost'}
          className="w-full justify-start"
          onClick={() => setCurrentView('queues')}
        >
          <Users className="w-4 h-4 mr-3" />
          Queue Management
        </Button>
        <Button
          variant={currentView === 'pins' ? 'secondary' : 'ghost'}
          className="w-full justify-start"
          onClick={() => setCurrentView('pins')}
        >
          <Lock className="w-4 h-4 mr-3" />
          PIN Management
        </Button>
        <Button
          variant={currentView === 'reports' ? 'secondary' : 'ghost'}
          className="w-full justify-start"
          onClick={() => setCurrentView('reports')}
        >
          <FileText className="w-4 h-4 mr-3" />
          Reports
        </Button>
        <Button
          variant={currentView === 'clinics' ? 'secondary' : 'ghost'}
          className="w-full justify-start"
          onClick={() => setCurrentView('clinics')}
        >
          <Users className="w-4 h-4 mr-3" />
          تكوين العيادات
        </Button>
        <Button
          variant={currentView === 'settings' ? 'secondary' : 'ghost'}
          className="w-full justify-start"
          onClick={() => setCurrentView('settings')}
        >
          <Settings className="w-4 h-4 mr-3" />
          Settings
        </Button>
      </nav>
    </div>
  )

  const renderDashboard = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">Dashboard</h1>
        <Button variant="outline" onClick={loadStats} disabled={loading}>
          <RefreshCw className="w-4 h-4 mr-2" />
          تحديث
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="bg-gray-800/50 border-gray-700">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">إجمالي المراجعين</p>
                <p className="text-3xl font-bold text-white">{stats?.totalPatients || 156}</p>
              </div>
              <Users className="w-8 h-8 text-blue-400" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gray-800/50 border-gray-700">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">الطوابير النشطة</p>
                <p className="text-3xl font-bold text-white">{stats?.totalWaiting || 8}</p>
              </div>
              <Activity className="w-8 h-8 text-green-400" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gray-800/50 border-gray-700">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">الفحوص المكتملة</p>
                <p className="text-3xl font-bold text-white">{stats?.totalCompleted || 89}</p>
              </div>
              <CheckCircle className="w-8 h-8 text-purple-400" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gray-800/50 border-gray-700">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">متوسط الانتظار</p>
                <p className="text-3xl font-bold text-white">12.5</p>
                <p className="text-gray-400 text-sm">دقيقة</p>
              </div>
              <Clock className="w-8 h-8 text-yellow-400" />
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
          {[
            { name: 'المختبر', current: 15, waiting: 8, avgTime: '8.5 دقيقة' },
            { name: 'العيون', current: 23, waiting: 12, avgTime: '12.3 دقيقة' },
            { name: 'الباطنية', current: 8, waiting: 5, avgTime: '15.2 دقيقة' },
            { name: 'الأنف والأذن', current: 12, waiting: 3, avgTime: '10.1 دقيقة' },
            { name: 'النفسية', current: 5, waiting: 2, avgTime: '20.5 دقيقة' },
            { name: 'الأسنان', current: 18, waiting: 7, avgTime: '9.8 دقيقة' }
          ].map((queue, index) => (
            <div key={index} className="flex items-center justify-between p-4 bg-gray-700/50 rounded-lg">
              <div>
                <h3 className="text-white font-semibold">{queue.name}</h3>
                <p className="text-gray-400 text-sm">الرقم الحالي: {queue.current} | في الانتظار: {queue.waiting}</p>
              </div>
              <div className="text-right">
                <p className="text-white font-semibold">{queue.avgTime}</p>
                <p className="text-gray-400 text-sm">متوسط الوقت</p>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  )

  const renderQueues = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">إدارة الطوابير</h1>
        <Button variant="outline" onClick={loadStats}>
          <RefreshCw className="w-4 h-4 mr-2" />
          تحديث
        </Button>
      </div>

      <div className="space-y-4">
        {[
          { id: 'lab', name: 'المختبر', current: 15, waiting: 8, avgTime: 8.5 },
          { id: 'ophthalmology', name: 'العيون', current: 23, waiting: 12, avgTime: 12.3 },
          { id: 'internal', name: 'الباطنية', current: 8, waiting: 5, avgTime: 15.2 },
          { id: 'ent', name: 'الأنف والأذن', current: 12, waiting: 3, avgTime: 10.1 }
        ].map((queue) => (
          <Card key={queue.id} className="bg-gray-800/50 border-gray-700">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <h3 className="text-white font-semibold text-lg mb-2">{queue.name}</h3>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <p className="text-2xl font-bold text-white">{queue.current}</p>
                      <p className="text-gray-400 text-sm">الرقم الحالي</p>
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-yellow-400">{queue.waiting}</p>
                      <p className="text-gray-400 text-sm">في الانتظار</p>
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-white">{queue.avgTime}</p>
                      <p className="text-gray-400 text-sm">متوسط الوقت (دقيقة)</p>
                    </div>
                  </div>
                </div>
                <div className="flex flex-col gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleCallNext(queue.id)}
                    disabled={loading}
                    className="border-yellow-500 text-yellow-400 hover:bg-yellow-500/10"
                  >
                    تعديل
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
        ))}
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
            <p className="text-3xl font-bold text-white">20</p>
            <p className="text-gray-400">أكواد نشطة</p>
          </CardContent>
        </Card>
        <Card className="bg-gray-800/50 border-gray-700">
          <CardContent className="p-6 text-center">
            <p className="text-3xl font-bold text-white">11</p>
            <p className="text-gray-400">مستخدمة</p>
          </CardContent>
        </Card>
        <Card className="bg-gray-800/50 border-gray-700">
          <CardContent className="p-6 text-center">
            <p className="text-3xl font-bold text-white">79</p>
            <p className="text-gray-400">متاحة</p>
          </CardContent>
        </Card>
      </div>

      {/* Active PINs */}
      <Card className="bg-gray-800/50 border-gray-700">
        <CardHeader>
          <CardTitle className="text-white">الأكواد النشطة</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {[
            { id: 1, code: 'DEN', station: 'نشط', status: 'active' },
            { id: 2, code: 'OPH', station: 'مستخدم', status: 'used' },
            { id: 3, code: 'LAB', station: 'مستخدم', status: 'used' },
            { id: 4, code: 'LAB', station: 'مستخدم', status: 'used' },
            { id: 5, code: 'DEN', station: 'نشط', status: 'active' },
            { id: 6, code: 'PSY', station: 'مستخدم', status: 'used' }
          ].map((pin) => (
            <div key={pin.id} className="flex items-center justify-between p-4 bg-gray-700/50 rounded-lg">
              <div className="flex items-center gap-4">
                <div className="text-2xl font-bold text-white">0{pin.id}</div>
                <div>
                  <p className="text-white font-semibold">{pin.code}</p>
                  <p className="text-gray-400 text-sm">{pin.station}</p>
                </div>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" className="border-yellow-500 text-yellow-400">
                  إعادة تعيين
                </Button>
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
          ))}
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
      <div className="grid grid-cols-2 gap-6">
        <Card className="bg-gray-800/50 border-gray-700">
          <CardHeader>
            <CardTitle className="text-white">تقارير يومية</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button variant="gradient" className="w-full justify-start">
              <FileText className="w-4 h-4 mr-2" />
              يومي PDF تقرير
            </Button>
            <Button variant="gradientSecondary" className="w-full justify-start">
              <FileText className="w-4 h-4 mr-2" />
              يومي Excel تقرير
            </Button>
          </CardContent>
        </Card>

        <Card className="bg-gray-800/50 border-gray-700">
          <CardHeader>
            <CardTitle className="text-white">تقارير أسبوعية</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button variant="gradient" className="w-full justify-start">
              <BarChart3 className="w-4 h-4 mr-2" />
              تقرير إجمالي أسبوعي
            </Button>
            <Button variant="gradientSecondary" className="w-full justify-start">
              <Activity className="w-4 h-4 mr-2" />
              تقرير الأداء الأسبوعي
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
          {[
            { name: 'تقرير يومي - 01-10-2024.pdf', size: '245 KB', date: '2024-10-01 09:15' },
            { name: 'تقرير الأداء الأسبوعي.xlsx', size: '156 KB', date: '2024-09-30 17:30' },
            { name: 'تقرير الطوابير اليومي.pdf', size: '189 KB', date: '2024-09-30 08:45' }
          ].map((report, index) => (
            <div key={index} className="flex items-center justify-between p-4 bg-gray-700/50 rounded-lg">
              <div className="flex items-center gap-3">
                <FileText className="w-5 h-5 text-gray-400" />
                <div>
                  <p className="text-white font-medium">{report.name}</p>
                  <p className="text-gray-400 text-sm">{report.size} - {report.date}</p>
                </div>
              </div>
              <Button variant="outline" size="sm" className="border-yellow-500 text-yellow-400">
                <Download className="w-4 h-4 mr-2" />
                تحميل
              </Button>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  )

  const renderSettings = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">إعدادات النظام</h1>
        <Button variant="outline" className="border-yellow-500 text-yellow-400">
          خط الإنتاجات
        </Button>
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
            {themes.map((theme) => (
              <div
                key={theme.id}
                className="p-4 border border-gray-600 rounded-lg cursor-pointer hover:border-yellow-500 transition-colors"
              >
                <div className="flex gap-2 mb-2">
                  {theme.colors.map((color, index) => (
                    <div
                      key={index}
                      className="w-4 h-4 rounded-full"
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
                <p className="text-white font-medium">{theme.name}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )

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
              <Settings className="w-4 h-4 mr-2" />
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
              <Home className="w-4 h-4 mr-2" />
              Home
            </Button>
            <Button variant="gradientSecondary" size="sm" onClick={onLogout}>
              <LogOut className="w-4 h-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>
      </div>

      <div className="flex">
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

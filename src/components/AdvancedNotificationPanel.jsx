import React, { useState, useEffect } from 'react'
import { playSimpleBeep, playDoubleBeep } from '../utils/simple-beep.js'

/**
 * Advanced Notification Panel with SSE Integration
 * Displays real-time notifications with simple beep sounds
 */
export default function AdvancedNotificationPanel({ userId, userType = 'patient' }) {
  const [notifications, setNotifications] = useState([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [isOpen, setIsOpen] = useState(false)
  const [isConnected, setIsConnected] = useState(false)

  useEffect(() => {
    if (!userId) return

    // Fetch existing notifications
    fetchNotifications()

    // Connect to SSE for real-time notifications
    const eventSource = new EventSource(
      `/api/v1/events/notifications?recipient_type=${userType}&recipient_id=${userId}`
    )

    eventSource.addEventListener('connected', (e) => {
      console.log('✅ Connected to notification stream')
      setIsConnected(true)
    })

    eventSource.addEventListener('notification', (e) => {
      const notification = JSON.parse(e.data)
      console.log('📬 New notification:', notification)
      
      // Add to notifications list
      setNotifications(prev => [notification, ...prev])
      setUnreadCount(prev => prev + 1)
      
      // Play simple beep based on priority
      if (notification.channels?.includes('sound')) {
        if (notification.priority === 'urgent') {
          playDoubleBeep()
        } else if (notification.priority === 'high' || notification.priority === 'normal') {
          playSimpleBeep(notification.priority)
        }
      }
      
      // Show browser notification if enabled
      if (notification.channels?.includes('browser') && 'Notification' in window) {
        if (Notification.permission === 'granted') {
          new Notification(notification.title, {
            body: notification.message,
            icon: '/logo.png',
            badge: '/logo.png'
          })
        } else if (Notification.permission !== 'denied') {
          Notification.requestPermission()
        }
      }
      
      // Vibrate if enabled
      if (notification.channels?.includes('vibrate') && 'vibrate' in navigator) {
        if (notification.priority === 'urgent') {
          navigator.vibrate([200, 100, 200, 100, 200])
        } else {
          navigator.vibrate(200)
        }
      }
    })

    eventSource.addEventListener('heartbeat', (e) => {
      // Keep connection alive
    })

    eventSource.onerror = () => {
      console.warn('⚠️ SSE connection error, reconnecting...')
      setIsConnected(false)
    }

    return () => {
      eventSource.close()
    }
  }, [userId, userType])

  const fetchNotifications = async () => {
    try {
      const response = await fetch(
        `/api/v1/notifications/get?recipient_type=${userType}&recipient_id=${userId}&limit=20`
      )
      const data = await response.json()
      
      if (data.success) {
        setNotifications(data.notifications || [])
        setUnreadCount(data.statistics?.unread || 0)
      }
    } catch (error) {
      console.error('Failed to fetch notifications:', error)
    }
  }

  const handleMarkAllRead = async () => {
    try {
      const response = await fetch('/api/v1/notifications/mark-read', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipient_id: userId,
          recipient_type: userType,
          mark_all: true
        })
      })
      
      const data = await response.json()
      
      if (data.success) {
        setNotifications(prev => prev.map(n => ({ ...n, read: true })))
        setUnreadCount(0)
      }
    } catch (error) {
      console.error('Failed to mark as read:', error)
    }
  }

  const handleMarkRead = async (notificationId) => {
    try {
      const response = await fetch('/api/v1/notifications/mark-read', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipient_id: userId,
          recipient_type: userType,
          notification_ids: [notificationId]
        })
      })
      
      const data = await response.json()
      
      if (data.success) {
        setNotifications(prev => 
          prev.map(n => n.id === notificationId ? { ...n, read: true } : n)
        )
        setUnreadCount(prev => Math.max(0, prev - 1))
      }
    } catch (error) {
      console.error('Failed to mark as read:', error)
    }
  }

  const getPriorityColor = (priority) => {
    switch(priority) {
      case 'urgent': return 'bg-red-500'
      case 'high': return 'bg-orange-500'
      case 'normal': return 'bg-blue-500'
      case 'low': return 'bg-gray-500'
      default: return 'bg-blue-500'
    }
  }

  const getPriorityIcon = (priority) => {
    switch(priority) {
      case 'urgent': return '🔴'
      case 'high': return '🟠'
      case 'normal': return '🔵'
      case 'low': return '⚪'
      default: return '🔵'
    }
  }

  const formatTime = (timestamp) => {
    const date = new Date(timestamp)
    const now = new Date()
    const diff = now - date
    
    if (diff < 60000) return 'الآن'
    if (diff < 3600000) return `${Math.floor(diff / 60000)} دقيقة`
    if (diff < 86400000) return `${Math.floor(diff / 3600000)} ساعة`
    return date.toLocaleString('ar-EG', { hour: '2-digit', minute: '2-digit' })
  }

  return (
    <div className="fixed top-4 left-4 z-50">
      {/* Notification Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative bg-white dark:bg-gray-800 p-3 rounded-full shadow-lg hover:shadow-xl transition-all"
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
        
        {/* Connection Status */}
        <div className={`absolute -top-1 -left-1 w-3 h-3 rounded-full ${isConnected ? 'bg-green-500' : 'bg-gray-400'}`} />
        
        {/* Unread Badge */}
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Notification Panel */}
      {isOpen && (
        <div className="absolute top-16 left-0 w-96 max-h-[600px] bg-white dark:bg-gray-800 rounded-lg shadow-2xl overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-500 to-purple-600 p-4 text-white">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-bold">الإشعارات</h3>
              <div className="flex gap-2">
                {notifications.length > 0 && (
                  <button
                    onClick={handleMarkAllRead}
                    className="text-xs bg-white/20 hover:bg-white/30 px-3 py-1 rounded"
                  >
                    تحديد الكل كمقروء
                  </button>
                )}
              </div>
            </div>
            {unreadCount > 0 && (
              <p className="text-sm mt-1 opacity-90">{unreadCount} إشعار غير مقروء</p>
            )}
          </div>

          {/* Notifications List */}
          <div className="overflow-y-auto max-h-[500px]">
            {notifications.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                <svg className="w-16 h-16 mx-auto mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                </svg>
                <p>لا توجد إشعارات</p>
              </div>
            ) : (
              notifications.map((notification) => (
                <div
                  key={notification.id}
                  onClick={() => !notification.read && handleMarkRead(notification.id)}
                  className={`p-4 border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors cursor-pointer ${
                    !notification.read ? 'bg-blue-50 dark:bg-blue-900/20' : ''
                  }`}
                >
                  <div className="flex items-start gap-3">
                    {/* Priority Indicator */}
                    <div className="text-2xl">{getPriorityIcon(notification.priority)}</div>
                    
                    <div className="flex-1">
                      {/* Title and Time */}
                      <div className="flex justify-between items-start mb-1">
                        <h4 className="font-bold text-sm">{notification.title}</h4>
                        <span className="text-xs text-gray-500">{formatTime(notification.timestamp)}</span>
                      </div>
                      
                      {/* Message */}
                      <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-line">{notification.message}</p>
                      
                      {/* Additional Data */}
                      {notification.data && (
                        <div className="mt-2 flex gap-2 flex-wrap">
                          {notification.data.clinic_name && (
                            <span className="text-xs bg-gray-200 dark:bg-gray-700 px-2 py-1 rounded">
                              {notification.data.clinic_name}
                            </span>
                          )}
                          {notification.data.position && (
                            <span className="text-xs bg-blue-200 dark:bg-blue-700 px-2 py-1 rounded">
                              الموقع: {notification.data.position}
                            </span>
                          )}
                          {notification.data.wait_time_text && (
                            <span className="text-xs bg-green-200 dark:bg-green-700 px-2 py-1 rounded">
                              ⏱️ {notification.data.wait_time_text}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                    
                    {/* Unread Indicator */}
                    {!notification.read && (
                      <div className="w-2 h-2 bg-blue-500 rounded-full mt-1" />
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}


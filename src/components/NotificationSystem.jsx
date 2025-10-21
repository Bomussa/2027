import { useEffect, useState, useRef } from 'react';

/**
 * NotificationSystem - نظام الإشعارات اللحظية
 * 
 * يقوم بمراقبة موقع المريض في الطابور وإرسال إشعارات عند:
 * - Position 3: "أنت الثالث - استعد"
 * - Position 2: "أنت الثاني - كن جاهزاً"
 * - Position 1: "دورك الآن!" + صوت تنبيه
 */
export default function NotificationSystem({ patientId, currentClinic, yourNumber, currentServing }) {
  const [notifications, setNotifications] = useState([]);
  const [hasPermission, setHasPermission] = useState(false);
  const audioRef = useRef(null);
  const lastPositionRef = useRef(null);

  // طلب إذن الإشعارات
  useEffect(() => {
    if ('Notification' in window) {
      if (Notification.permission === 'granted') {
        setHasPermission(true);
      } else if (Notification.permission !== 'denied') {
        Notification.requestPermission().then(permission => {
          setHasPermission(permission === 'granted');
        });
      }
    }
  }, []);

  // حساب الموقع في الطابور
  const position = yourNumber && currentServing ? yourNumber - currentServing : null;

  // مراقبة التغييرات وإرسال الإشعارات
  useEffect(() => {
    if (!currentClinic || position === null || position < 0) return;

    // تجنب إرسال إشعارات مكررة
    if (lastPositionRef.current === position) return;
    lastPositionRef.current = position;

    let title = '';
    let body = '';
    let playSound = false;
    let type = 'info';

    if (position === 0) {
      // دورك الآن!
      title = '🔔 دورك الآن!';
      body = `توجه إلى ${currentClinic.nameAr} فوراً`;
      playSound = true;
      type = 'urgent';
    } else if (position === 1) {
      // أنت التالي
      title = '⚠️ أنت التالي';
      body = `كن جاهزاً للدخول إلى ${currentClinic.nameAr}`;
      playSound = true;
      type = 'warning';
    } else if (position === 2) {
      // أنت الثاني
      title = '📢 أنت الثاني';
      body = `استعد للدخول إلى ${currentClinic.nameAr}`;
      type = 'info';
    } else if (position === 3) {
      // أنت الثالث
      title = 'ℹ️ أنت الثالث';
      body = `قريباً سيحين دورك في ${currentClinic.nameAr}`;
      type = 'info';
    }

    if (title) {
      // إضافة الإشعار للقائمة
      const notification = {
        id: Date.now(),
        title,
        body,
        type,
        timestamp: new Date(),
        clinic: currentClinic.nameAr,
        position
      };
      setNotifications(prev => [notification, ...prev.slice(0, 4)]);

      // إرسال إشعار المتصفح
      if (hasPermission) {
        new Notification(title, {
          body,
          icon: '/img/logo.png',
          badge: '/img/logo.png',
          tag: `clinic-${currentClinic.id}-${position}`,
          requireInteraction: position === 0
        });
      }

      // تشغيل الصوت
      if (playSound && audioRef.current) {
        audioRef.current.play().catch(err => console.log('Audio play failed:', err));
      }
    }
  }, [position, currentClinic, yourNumber, currentServing, hasPermission]);

  return (
    <div className="notification-system">
      {/* صوت التنبيه */}
      <audio ref={audioRef} src="/notification.mp3" preload="auto" />

      {/* عرض الإشعارات */}
      {notifications.length > 0 && (
        <div className="fixed top-4 right-4 z-50 space-y-2 max-w-sm">
          {notifications.map(notif => (
            <div
              key={notif.id}
              className={`
                p-4 rounded-lg shadow-lg animate-slide-in
                ${notif.type === 'urgent' ? 'bg-red-500 text-white' : ''}
                ${notif.type === 'warning' ? 'bg-yellow-500 text-white' : ''}
                ${notif.type === 'info' ? 'bg-blue-500 text-white' : ''}
              `}
            >
              <div className="font-bold text-lg">{notif.title}</div>
              <div className="text-sm mt-1">{notif.body}</div>
              <div className="text-xs mt-2 opacity-75">
                {notif.timestamp.toLocaleTimeString('ar-SA')}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}


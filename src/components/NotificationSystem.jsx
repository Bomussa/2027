import { useEffect, useState, useRef, useCallback } from 'react';

/**
 * NotificationSystem - نظام الإشعارات البسيط والواضح
 * 
 * يظهر فقط في الوقت المناسب ولا يعيق رؤية المحتوى
 */
export default function NotificationSystem({ patientId, currentClinic, yourNumber, currentServing }) {
  const [notification, setNotification] = useState(null);
  const [hasPermission, setHasPermission] = useState(false);
  const audioContextRef = useRef(null);
  const lastPositionRef = useRef(null);

  // إعداد Audio Context
  useEffect(() => {
    try {
      audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
    } catch (e) {
      console.warn('⚠️ Audio Context غير متاح:', e);
    }
  }, []);

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

  // تشغيل نغمة بسيطة
  const playNotificationSound = useCallback((type = 'normal') => {
    if (!audioContextRef.current) return;

    try {
      const ctx = audioContextRef.current;
      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);

      switch (type) {
        case 'urgent': // حان دورك
          oscillator.frequency.value = 880;
          gainNode.gain.setValueAtTime(0.3, ctx.currentTime);
          gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);
          oscillator.start();
          oscillator.stop(ctx.currentTime + 0.5);
          
          setTimeout(() => {
            const osc2 = ctx.createOscillator();
            const gain2 = ctx.createGain();
            osc2.connect(gain2);
            gain2.connect(ctx.destination);
            osc2.frequency.value = 1046;
            gain2.gain.setValueAtTime(0.3, ctx.currentTime);
            gain2.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);
            osc2.start();
            osc2.stop(ctx.currentTime + 0.5);
          }, 200);
          break;

        case 'high':
          oscillator.frequency.value = 659;
          gainNode.gain.setValueAtTime(0.25, ctx.currentTime);
          gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4);
          oscillator.start();
          oscillator.stop(ctx.currentTime + 0.4);
          break;

        default:
          oscillator.frequency.value = 523;
          gainNode.gain.setValueAtTime(0.2, ctx.currentTime);
          gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
          oscillator.start();
          oscillator.stop(ctx.currentTime + 0.3);
      }
    } catch (e) {
      console.warn('⚠️ خطأ في تشغيل الصوت:', e);
    }
  }, []);

  // حساب الموقع في الطابور
  const position = yourNumber && currentServing ? yourNumber - currentServing : null;

  // مراقبة التغييرات وإرسال الإشعارات في الوقت المناسب فقط
  useEffect(() => {
    if (!currentClinic || position === null || position < 0) return;

    // تجنب إرسال إشعارات مكررة
    if (lastPositionRef.current === position) return;
    lastPositionRef.current = position;

    let notif = null;
    let soundType = null;
    let vibrate = false;

    // إشعارات فقط للمواقع المهمة
    if (position === 0) {
      // دورك الآن!
      notif = {
        title: '🔴 حان دورك الآن!',
        message: `توجه إلى ${currentClinic.nameAr} فوراً`,
        bgColor: 'bg-red-600',
        priority: 'urgent'
      };
      soundType = 'urgent';
      vibrate = true;
    } else if (position === 1) {
      // أنت التالي
      notif = {
        title: '⚠️ أنت التالي',
        message: `كن جاهزاً - ${currentClinic.nameAr}`,
        bgColor: 'bg-orange-600',
        priority: 'high'
      };
      soundType = 'high';
      vibrate = true;
    } else if (position === 2) {
      // اقترب دورك
      notif = {
        title: '⏰ اقترب دورك',
        message: `موقعك الثاني في ${currentClinic.nameAr}`,
        bgColor: 'bg-yellow-600',
        priority: 'high'
      };
      soundType = 'high';
      vibrate = false;
    }

    if (notif) {
      setNotification(notif);

      // تشغيل الصوت
      if (soundType) {
        playNotificationSound(soundType);
      }

      // الاهتزاز
      if (vibrate && 'vibrate' in navigator) {
        if (notif.priority === 'urgent') {
          navigator.vibrate([200, 100, 200, 100, 200]);
        } else {
          navigator.vibrate([200, 100, 200]);
        }
      }

      // إشعار المتصفح
      if (hasPermission && (notif.priority === 'urgent' || notif.priority === 'high')) {
        new Notification(notif.title, {
          body: notif.message,
          icon: '/medical_logo.jpg',
          badge: '/medical_logo.jpg',
          requireInteraction: notif.priority === 'urgent'
        });
      }

      // إخفاء الإشعار تلقائياً
      const timeout = notif.priority === 'urgent' ? 10000 : 6000;
      setTimeout(() => {
        setNotification(null);
      }, timeout);
    }
  }, [position, currentClinic, yourNumber, playNotificationSound, hasPermission]);

  // لا نعرض شيء إذا لم يكن هناك إشعار
  if (!notification) return null;

  return (
    <div className="notification-system">
      {/* إشعار بسيط في الأعلى - لا يعيق المحتوى */}
      <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50 max-w-md w-11/12">
        <div
          className={`
            ${notification.bgColor} text-white
            px-8 py-6 rounded-2xl shadow-2xl
            flex items-center justify-between gap-4
            backdrop-blur-sm bg-opacity-98
            animate-slide-down
            border-2 border-white border-opacity-30
          `}
          style={{
            animation: 'slideDown 0.5s ease-out',
            fontFamily: 'system-ui, -apple-system, sans-serif'
          }}
        >
          <div className="flex-1">
            <div className="font-black text-2xl mb-2" style={{ letterSpacing: '0.5px' }}>{notification.title}</div>
            <div className="text-lg font-semibold opacity-100" style={{ letterSpacing: '0.3px' }}>{notification.message}</div>
          </div>
          <button
            onClick={() => setNotification(null)}
            className="text-white opacity-90 hover:opacity-100 text-3xl leading-none px-3 font-bold"
            aria-label="إغلاق"
          >
            ×
          </button>
        </div>
      </div>

      {/* الأنيميشن */}
      <style>{`
        @keyframes slideDown {
          from {
            transform: translate(-50%, -100px);
            opacity: 0;
          }
          to {
            transform: translate(-50%, 0);
            opacity: 1;
          }
        }
      `}</style>
    </div>
  );
}


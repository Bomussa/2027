import { useEffect, useState, useRef, useCallback } from 'react';

/**
 * NotificationSystem - نظام الإشعارات البسيط والواضح مع إرشادات الموقع
 * 
 * يظهر فقط في الوقت المناسب ولا يعيق رؤية المحتوى
 * يوفر إرشادات واضحة لموقع العيادة وكيفية الوصول إليها
 */
export default function NotificationSystem({ patientId, currentClinic, yourNumber, currentServing, allStationsCompleted }) {
  const [notification, setNotification] = useState(null);
  const [hasPermission, setHasPermission] = useState(false);
  const [hasShownLocationGuide, setHasShownLocationGuide] = useState(false);
  const [hasShownCompletionNotice, setHasShownCompletionNotice] = useState(false);
  const audioContextRef = useRef(null);
  const lastPositionRef = useRef(null);
  const lastClinicRef = useRef(null);

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

  // الحصول على إرشادات الموقع للعيادة
  const getLocationGuide = useCallback((clinic) => {
    if (!clinic) return null;

    const floor = clinic.floor || '';
    const floorCode = clinic.floorCode || '';
    const clinicName = clinic.nameAr || clinic.name || '';

    // إرشادات حسب الطابق
    if (floor === 'الميزانين' || floorCode === 'M') {
      return {
        icon: '🏢',
        title: `📍 ${clinicName}`,
        message: `يرجى التوجه إلى طابق الميزانين عن طريق المصعد بالضغط على حرف M`,
        bgColor: 'bg-blue-600'
      };
    } else if (floor === 'الطابق الثاني' || floorCode === '2') {
      return {
        icon: '🏢',
        title: `📍 ${clinicName}`,
        message: `يرجى التوجه إلى الطابق الثاني عن طريق المصعد بالضغط على رقم 2 لإكمال فحص باقي عيادات اللجنة الطبية`,
        bgColor: 'bg-blue-600'
      };
    } else if (floor === 'الطابق الثالث' || floorCode === '3') {
      return {
        icon: '🏢',
        title: `📍 ${clinicName}`,
        message: `يرجى التوجه إلى الطابق الثالث عن طريق المصعد بالضغط على رقم 3 لإكمال فحص باقي عيادات اللجنة الطبية`,
        bgColor: 'bg-blue-600'
      };
    } else if (floor === 'الطابق الأرضي' || floorCode === 'G') {
      return {
        icon: '🏢',
        title: `📍 ${clinicName}`,
        message: `يرجى التوجه إلى الطابق الأرضي عن طريق المصعد بالضغط على حرف G لإكمال فحص باقي عيادات اللجنة الطبية`,
        bgColor: 'bg-blue-600'
      };
    }

    return null;
  }, []);

  // إشعار إنهاء الفحص
  useEffect(() => {
    if (allStationsCompleted && !hasShownCompletionNotice) {
      setHasShownCompletionNotice(true);
      
      const completionNotif = {
        title: '✅ تم إنهاء الفحص بنجاح',
        message: 'يرجى التوجه إلى استقبال اللجنة الطبية',
        bgColor: 'bg-green-600',
        priority: 'success',
        isCompletionNotice: true
      };

      setNotification(completionNotif);
      playNotificationSound('normal');

      // إشعار المتصفح
      if (hasPermission) {
        new Notification(completionNotif.title, {
          body: completionNotif.message,
          icon: '/medical_logo.jpg',
          badge: '/medical_logo.jpg',
          requireInteraction: true
        });
      }

      // الاهتزاز
      if ('vibrate' in navigator) {
        navigator.vibrate([200, 100, 200]);
      }

      // يبقى ظاهراً لمدة 30 ثانية
      setTimeout(() => {
        setNotification(prev => {
          if (prev && prev.isCompletionNotice) return null;
          return prev;
        });
      }, 30000);
    }
  }, [allStationsCompleted, hasShownCompletionNotice, playNotificationSound, hasPermission]);

  // عرض دليل الموقع عند تغيير العيادة
  useEffect(() => {
    if (!currentClinic) return;

    // إذا تغيرت العيادة، نعرض دليل الموقع
    if (lastClinicRef.current !== currentClinic.id) {
      lastClinicRef.current = currentClinic.id;
      setHasShownLocationGuide(false);

      const locationGuide = getLocationGuide(currentClinic);
      if (locationGuide) {
        setNotification({
          ...locationGuide,
          priority: 'info',
          isLocationGuide: true
        });

        playNotificationSound('normal');
        setHasShownLocationGuide(true);

        // إخفاء دليل الموقع بعد 30 ثانية
        setTimeout(() => {
          setNotification(prev => {
            if (prev && prev.isLocationGuide) return null;
            return prev;
          });
        }, 30000);
      }
    }
  }, [currentClinic, getLocationGuide, playNotificationSound]);

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
        title: '🔴 حان دورك',
        message: `توجه للعيادة المحددة: ${currentClinic.nameAr}`,
        bgColor: 'bg-red-600',
        priority: 'urgent'
      };
      soundType = 'urgent';
      vibrate = true;
    } else if (position === 1) {
      // باقي 1 قبلك
      notif = {
        title: '⚠️ اقترب دورك',
        message: `باقي 1 قبلك في ${currentClinic.nameAr}`,
        bgColor: 'bg-orange-600',
        priority: 'high'
      };
      soundType = 'high';
      vibrate = true;
    } else if (position === 2) {
      // باقي 2 قبلك
      notif = {
        title: '⏰ اقترب دورك',
        message: `باقي 2 قبلك في ${currentClinic.nameAr}`,
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
        setNotification(prev => {
          if (prev && !prev.isLocationGuide) return null;
          return prev;
        });
      }, timeout);
    }
  }, [position, currentClinic, yourNumber, playNotificationSound, hasPermission]);

  // لا نعرض شيء إذا لم يكن هناك إشعار
  if (!notification) return null;

  return (
    <div className="notification-system">
      {/* إشعار بسيط في اليمين - لا يعيق المحتوى */}
      <div className="fixed top-4 right-4 z-50 max-w-md w-auto">
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
            <div className="font-black text-2xl mb-2" style={{ letterSpacing: '0.5px' }}>
              {notification.title}
            </div>
            <div className="text-lg font-semibold opacity-100" style={{ letterSpacing: '0.3px' }}>
              {notification.message}
            </div>
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


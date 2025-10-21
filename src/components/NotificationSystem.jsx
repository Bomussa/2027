import { useState, useEffect, useCallback, useRef } from 'react';

/**
 * نظام الإشعارات المحسّن للمراجعين
 * - إشعارات لحظية دقيقة 100% حسب الموقع في الطابور
 * - إشعارات الموقع (الطابق) تظهر مرة واحدة فقط لكل طابق
 * - نغمة بسيطة وواضحة
 * - لا يعيق المحتوى
 */
export default function NotificationSystem({ 
  patientId, 
  currentClinic, 
  yourNumber, 
  currentServing,
  allStationsCompleted 
}) {
  const [notification, setNotification] = useState(null);
  const [hasPermission, setHasPermission] = useState(false);
  const [hasShownLocationGuide, setHasShownLocationGuide] = useState(false);
  const [hasShownCompletionNotice, setHasShownCompletionNotice] = useState(false);
  
  // تتبع آخر موقع وعيادة وطابق لتجنب التكرار
  const lastPositionRef = useRef(null);
  const lastClinicRef = useRef(null);
  const lastFloorRef = useRef(null); // لتتبع الطابق وعدم تكرار الإشعار
  const hasShownInitialFloorGuide = useRef(false); // لعرض إشعار الطابق في البداية

  // طلب إذن الإشعارات
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission().then(permission => {
        setHasPermission(permission === 'granted');
      });
    } else if ('Notification' in window && Notification.permission === 'granted') {
      setHasPermission(true);
    }
  }, []);

  // دالة تشغيل النغمة
  const playNotificationSound = useCallback((type) => {
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    // نغمات بسيطة وواضحة
    if (type === 'urgent') {
      // نغمة عاجلة (A5 + C6)
      oscillator.frequency.value = 880;
      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.3);
      
      // نغمة ثانية
      setTimeout(() => {
        const osc2 = audioContext.createOscillator();
        const gain2 = audioContext.createGain();
        osc2.connect(gain2);
        gain2.connect(audioContext.destination);
        osc2.frequency.value = 1046;
        gain2.gain.setValueAtTime(0.3, audioContext.currentTime);
        gain2.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
        osc2.start(audioContext.currentTime);
        osc2.stop(audioContext.currentTime + 0.3);
      }, 300);
    } else if (type === 'high') {
      // نغمة عالية (E5)
      oscillator.frequency.value = 659;
      gainNode.gain.setValueAtTime(0.25, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.4);
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.4);
    } else if (type === 'success') {
      // نغمة نجاح (C5)
      oscillator.frequency.value = 523;
      gainNode.gain.setValueAtTime(0.2, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.5);
    } else {
      // نغمة عادية (A4)
      oscillator.frequency.value = 440;
      gainNode.gain.setValueAtTime(0.15, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.3);
    }
  }, []);

  // الحصول على إرشادات الموقع للطابق (مرة واحدة فقط لكل طابق)
  const getLocationGuide = useCallback((clinic) => {
    if (!clinic) return null;

    const floor = clinic.floor || '';
    const floorCode = clinic.floorCode || '';

    // التحقق من أننا لم نعرض إشعار هذا الطابق من قبل
    const currentFloor = floor || floorCode;
    if (lastFloorRef.current === currentFloor) {
      return null; // لا نعرض إشعار الطابق مرة أخرى
    }

    // إرشادات حسب الطابق
    if (floor === 'الميزانين' || floorCode === 'M') {
      return {
        icon: '🏢',
        title: `📍 الميزانين`,
        message: `يرجى التوجه إلى طابق الميزانين عن طريق المصعد بالضغط على حرف M`,
        bgColor: 'bg-blue-600',
        floor: currentFloor
      };
    } else if (floor === 'الطابق الثاني' || floorCode === '2') {
      return {
        icon: '🏢',
        title: `📍 الطابق الثاني`,
        message: `يرجى التوجه إلى الطابق الثاني عن طريق المصعد بالضغط على رقم 2 لإكمال فحص باقي عيادات اللجنة الطبية`,
        bgColor: 'bg-blue-600',
        floor: currentFloor
      };
    } else if (floor === 'الطابق الثالث' || floorCode === '3') {
      return {
        icon: '🏢',
        title: `📍 الطابق الثالث`,
        message: `يرجى التوجه إلى الطابق الثالث عن طريق المصعد بالضغط على رقم 3 لإكمال فحص باقي عيادات اللجنة الطبية`,
        bgColor: 'bg-blue-600',
        floor: currentFloor
      };
    } else if (floor === 'الطابق الأرضي' || floorCode === 'G') {
      return {
        icon: '🏢',
        title: `📍 الطابق الأرضي`,
        message: `يرجى التوجه إلى الطابق الأرضي عن طريق المصعد بالضغط على حرف G لإكمال فحص باقي عيادات اللجنة الطبية`,
        bgColor: 'bg-blue-600',
        floor: currentFloor
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
      playNotificationSound('success');

      // إشعار المتصفح
      if (hasPermission) {
        new Notification(completionNotif.title, {
          body: completionNotif.message,
          icon: '/medical_logo.jpg',
          badge: '/medical_logo.jpg',
          requireInteraction: true
        });
      }

      // إخفاء بعد 30 ثانية
      setTimeout(() => {
        setNotification(prev => {
          if (prev && prev.isCompletionNotice) return null;
          return prev;
        });
      }, 30000);
    }
  }, [allStationsCompleted, hasShownCompletionNotice, playNotificationSound, hasPermission]);

  // عرض إشعار الطابق في البداية فوراً
  useEffect(() => {
    if (!currentClinic || hasShownInitialFloorGuide.current) return;

    hasShownInitialFloorGuide.current = true;
    const locationGuide = getLocationGuide(currentClinic);
    
    if (locationGuide) {
      lastFloorRef.current = locationGuide.floor;
      
      setNotification({
        ...locationGuide,
        priority: 'info',
        isLocationGuide: true
      });

      playNotificationSound('normal');

      // إخفاء دليل الموقع بعد 30 ثانية
      setTimeout(() => {
        setNotification(prev => {
          if (prev && prev.isLocationGuide) return null;
          return prev;
        });
      }, 30000);
    }
  }, [currentClinic, getLocationGuide, playNotificationSound]);

  // مراقبة تغيير العيادة وعرض دليل الموقع (مرة واحدة لكل طابق)
  useEffect(() => {
    if (!currentClinic) return;

    // إذا تغيرت العيادة
    if (lastClinicRef.current !== currentClinic.id) {
      lastClinicRef.current = currentClinic.id;

      const locationGuide = getLocationGuide(currentClinic);
      if (locationGuide && lastFloorRef.current !== locationGuide.floor) {
        // تحديث آخر طابق تم عرضه
        lastFloorRef.current = locationGuide.floor;
        
        setNotification({
          ...locationGuide,
          priority: 'info',
          isLocationGuide: true
        });

        playNotificationSound('normal');

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

  // حساب الموقع في الطابور بدقة 100%
  const position = (yourNumber !== null && yourNumber !== undefined && 
                    currentServing !== null && currentServing !== undefined) 
                    ? yourNumber - currentServing 
                    : null;

  // مراقبة التغييرات وإرسال الإشعارات في الوقت المناسب بدقة 100%
  useEffect(() => {
    if (!currentClinic || position === null || position < 0) return;

    // تجنب إرسال إشعارات مكررة - دقة 100%
    if (lastPositionRef.current === position) return;
    lastPositionRef.current = position;

    let notif = null;
    let soundType = null;
    let vibrate = false;

    // إشعارات دقيقة حسب الموقع
    if (position === 0) {
      // حان دورك - أولوية عاجلة مع ذكر اسم العيادة
      const clinicName = currentClinic?.nameAr || currentClinic?.name || 'العيادة المحددة';
      notif = {
        title: '🔴 حان دورك',
        message: `اتجه لعيادة ${clinicName}`,
        bgColor: 'bg-red-600',
        priority: 'urgent'
      };
      soundType = 'urgent';
      vibrate = true;
    } else if (position === 1) {
      // أنت التالي - أولوية عالية
      notif = {
        title: '🟠 اقترب دورك',
        message: 'باقي 1 قبلك',
        bgColor: 'bg-orange-600',
        priority: 'high'
      };
      soundType = 'high';
      vibrate = true;
    } else if (position === 2) {
      // اقترب دورك - أولوية متوسطة
      notif = {
        title: '🟡 اقترب دورك',
        message: 'باقي 2 قبلك',
        bgColor: 'bg-yellow-600',
        priority: 'medium'
      };
      soundType = 'high';
    }

    if (notif) {
      setNotification(notif);
      playNotificationSound(soundType);

      // اهتزاز للإشعارات المهمة
      if (vibrate && 'vibrate' in navigator) {
        navigator.vibrate([200, 100, 200]);
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
          if (prev && !prev.isLocationGuide && !prev.isCompletionNotice) return null;
          return prev;
        });
      }, timeout);
    }
  }, [position, currentClinic, yourNumber, currentServing, playNotificationSound, hasPermission]);

  // لا نعرض شيء إذا لم يكن هناك إشعار
  if (!notification) return null;

  return (
    <div className="notification-system">
      {/* إشعار بسيط في اليمين - لا يعيق المحتوى */}
      <div className="fixed top-20 right-4 z-50 max-w-lg w-auto">
        <div
          className={`
            ${notification.bgColor} text-white
            px-6 py-4 rounded-2xl shadow-2xl
            flex items-center justify-between gap-3
            backdrop-blur-sm bg-opacity-98
            animate-slide-down
            border-2 border-white border-opacity-30
          `}
          style={{
            animation: 'slideDown 0.5s ease-out',
            fontFamily: 'system-ui, -apple-system, sans-serif'
          }}
        >
          {/* أيقونة صغيرة */}
          <div className="text-2xl flex-shrink-0">
            {notification.icon || '🔔'}
          </div>
          
          {/* النص */}
          <div className="flex-1">
            <div className="font-black text-2xl mb-1" style={{ letterSpacing: '0.5px' }}>
              {notification.title}
            </div>
            <div className="text-lg font-bold opacity-100" style={{ letterSpacing: '0.3px' }}>
              {notification.message}
            </div>
          </div>
          
          {/* زر الإغلاق */}
          <button
            onClick={() => setNotification(null)}
            className="text-white opacity-90 hover:opacity-100 text-2xl leading-none px-2 font-bold flex-shrink-0"
            aria-label="إغلاق"
          >
            ×
          </button>
        </div>
      </div>

      <style jsx>{`
        @keyframes slideDown {
          from {
            transform: translateY(-100px);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }
      `}</style>
    </div>
  );
}


import { useEffect, useState, useRef, useCallback } from 'react';

/**
 * NotificationSystem - نظام الإشعارات اللحظية المحسّن
 * 
 * يوفر:
 * - إشعارات لحظية مع نغمة بسيطة وواضحة
 * - دليل تفاعلي للمراجع
 * - تحديثات فورية لموقع المراجع في الطابور
 * - إرشادات واضحة لكل خطوة
 */
export default function NotificationSystem({ patientId, currentClinic, yourNumber, currentServing, allClinics = [], completedClinics = [] }) {
  const [notifications, setNotifications] = useState([]);
  const [hasPermission, setHasPermission] = useState(false);
  const [showGuide, setShowGuide] = useState(true);
  const audioContextRef = useRef(null);
  const lastPositionRef = useRef(null);
  const lastNotificationRef = useRef(null);

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
          oscillator.frequency.value = 880; // A5
          gainNode.gain.setValueAtTime(0.3, ctx.currentTime);
          gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);
          oscillator.start();
          oscillator.stop(ctx.currentTime + 0.5);
          
          // نغمة ثانية
          setTimeout(() => {
            const osc2 = ctx.createOscillator();
            const gain2 = ctx.createGain();
            osc2.connect(gain2);
            gain2.connect(ctx.destination);
            osc2.frequency.value = 1046; // C6
            gain2.gain.setValueAtTime(0.3, ctx.currentTime);
            gain2.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);
            osc2.start();
            osc2.stop(ctx.currentTime + 0.5);
          }, 200);
          break;

        case 'high': // اقترب دورك
          oscillator.frequency.value = 659; // E5
          gainNode.gain.setValueAtTime(0.25, ctx.currentTime);
          gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4);
          oscillator.start();
          oscillator.stop(ctx.currentTime + 0.4);
          break;

        case 'success': // تم إنهاء الفحص
          oscillator.frequency.value = 523; // C5
          gainNode.gain.setValueAtTime(0.2, ctx.currentTime);
          gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
          oscillator.start();
          oscillator.stop(ctx.currentTime + 0.3);
          break;

        default: // إشعار عادي
          oscillator.frequency.value = 440; // A4
          gainNode.gain.setValueAtTime(0.15, ctx.currentTime);
          gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.2);
          oscillator.start();
          oscillator.stop(ctx.currentTime + 0.2);
      }
    } catch (e) {
      console.warn('⚠️ خطأ في تشغيل الصوت:', e);
    }
  }, []);

  // إضافة إشعار
  const addNotification = useCallback((notification) => {
    // تجنب التكرار
    const notifKey = `${notification.type}-${notification.position || 0}-${Date.now()}`;
    if (lastNotificationRef.current === notifKey) return;
    lastNotificationRef.current = notifKey;

    const fullNotification = {
      id: Date.now(),
      timestamp: new Date(),
      ...notification
    };

    setNotifications(prev => [fullNotification, ...prev.slice(0, 9)]);

    // إشعار المتصفح
    if (hasPermission && (notification.priority === 'urgent' || notification.priority === 'high')) {
      new Notification(notification.title, {
        body: notification.body,
        icon: '/medical_logo.jpg',
        badge: '/medical_logo.jpg',
        tag: notifKey,
        requireInteraction: notification.priority === 'urgent'
      });
    }

    // تشغيل الصوت
    if (notification.sound) {
      playNotificationSound(notification.soundType || 'normal');
    }

    // الاهتزاز
    if (notification.vibrate && 'vibrate' in navigator) {
      if (notification.priority === 'urgent') {
        navigator.vibrate([200, 100, 200, 100, 200]);
      } else if (notification.priority === 'high') {
        navigator.vibrate([200, 100, 200]);
      } else {
        navigator.vibrate(200);
      }
    }
  }, [hasPermission, playNotificationSound]);

  // حساب الموقع في الطابور
  const position = yourNumber && currentServing ? yourNumber - currentServing : null;

  // مراقبة التغييرات وإرسال الإشعارات
  useEffect(() => {
    if (!currentClinic || position === null || position < 0) return;

    // تجنب إرسال إشعارات مكررة للموقع نفسه
    if (lastPositionRef.current === position) return;
    lastPositionRef.current = position;

    if (position === 0) {
      // دورك الآن!
      addNotification({
        type: 'YOUR_TURN',
        title: '🔴 حان دورك الآن!',
        body: `توجه إلى ${currentClinic.nameAr} فوراً - رقمك: ${yourNumber}`,
        clinic: currentClinic.nameAr,
        position: 0,
        priority: 'urgent',
        sound: true,
        soundType: 'urgent',
        vibrate: true,
        bgColor: 'bg-red-600'
      });
    } else if (position === 1) {
      // أنت التالي
      addNotification({
        type: 'NEXT_TURN',
        title: '⚠️ أنت التالي',
        body: `كن جاهزاً للدخول إلى ${currentClinic.nameAr}`,
        clinic: currentClinic.nameAr,
        position: 1,
        priority: 'high',
        sound: true,
        soundType: 'high',
        vibrate: true,
        bgColor: 'bg-orange-600'
      });
    } else if (position === 2) {
      // أنت الثاني
      addNotification({
        type: 'NEAR_TURN',
        title: '⏰ اقترب دورك',
        body: `موقعك الثاني في ${currentClinic.nameAr} - استعد`,
        clinic: currentClinic.nameAr,
        position: 2,
        priority: 'high',
        sound: true,
        soundType: 'high',
        vibrate: false,
        bgColor: 'bg-yellow-600'
      });
    } else if (position === 3) {
      // أنت الثالث
      addNotification({
        type: 'APPROACHING',
        title: '📢 قريباً دورك',
        body: `موقعك الثالث في ${currentClinic.nameAr}`,
        clinic: currentClinic.nameAr,
        position: 3,
        priority: 'normal',
        sound: true,
        soundType: 'normal',
        vibrate: false,
        bgColor: 'bg-blue-600'
      });
    } else if (position <= 10) {
      // تحديث الموقع
      addNotification({
        type: 'QUEUE_UPDATE',
        title: '📊 تحديث الطابور',
        body: `موقعك: ${position} في ${currentClinic.nameAr}`,
        clinic: currentClinic.nameAr,
        position,
        priority: 'low',
        sound: false,
        vibrate: false,
        bgColor: 'bg-gray-600'
      });
    }
  }, [position, currentClinic, yourNumber, addNotification]);

  // حساب التقدم
  const progress = allClinics.length > 0 
    ? Math.round((completedClinics.length / allClinics.length) * 100)
    : 0;

  // العيادة التالية
  const nextClinic = allClinics.find(c => !completedClinics.includes(c.id) && c.id !== currentClinic?.id);

  return (
    <div className="notification-system">
      {/* الإشعارات المنبثقة */}
      {notifications.length > 0 && (
        <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50 space-y-3 max-w-md w-11/12">
          {notifications.slice(0, 3).map(notif => (
            <div
              key={notif.id}
              className={`
                ${notif.bgColor || 'bg-gray-700'} text-white
                p-4 rounded-xl shadow-2xl
                animate-slide-down
                flex items-start gap-3
                backdrop-blur-sm bg-opacity-95
              `}
              style={{
                animation: 'slideDown 0.5s ease-out'
              }}
            >
              <div className="flex-1">
                <div className="font-bold text-lg mb-1">{notif.title}</div>
                <div className="text-sm opacity-95">{notif.body}</div>
                <div className="text-xs mt-2 opacity-75">
                  {notif.timestamp.toLocaleTimeString('ar-SA', { 
                    hour: '2-digit', 
                    minute: '2-digit' 
                  })}
                </div>
              </div>
              <button
                onClick={() => setNotifications(prev => prev.filter(n => n.id !== notif.id))}
                className="text-white opacity-75 hover:opacity-100 text-xl leading-none"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}

      {/* دليل المراجع */}
      {showGuide && (
        <div className="fixed bottom-6 right-6 z-40 max-w-sm w-11/12 md:w-96">
          <div 
            className="bg-gradient-to-br from-purple-600 to-indigo-700 text-white rounded-2xl shadow-2xl overflow-hidden"
            style={{
              animation: 'fadeIn 0.5s ease-out'
            }}
          >
            {/* رأس الدليل */}
            <div className="p-4 border-b border-white border-opacity-20 flex justify-between items-center">
              <h3 className="text-lg font-bold flex items-center gap-2">
                <span>📋</span>
                <span>دليل المراجع</span>
              </h3>
              <button
                onClick={() => setShowGuide(false)}
                className="bg-white bg-opacity-20 hover:bg-opacity-30 px-3 py-1 rounded-lg text-sm transition-all"
              >
                إخفاء
              </button>
            </div>

            {/* محتوى الدليل */}
            <div className="p-4 space-y-4">
              {/* التقدم الكلي */}
              {allClinics.length > 0 && (
                <div className="bg-white bg-opacity-10 rounded-lg p-3">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-semibold">التقدم الكلي</span>
                    <span className="text-sm font-bold">{progress}%</span>
                  </div>
                  <div className="w-full bg-white bg-opacity-20 rounded-full h-3 overflow-hidden">
                    <div 
                      className="bg-green-400 h-full rounded-full transition-all duration-500"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                  <div className="text-xs mt-2 opacity-90">
                    {completedClinics.length} من {allClinics.length} عيادة
                  </div>
                </div>
              )}

              {/* العيادة الحالية */}
              {currentClinic && (
                <div className="bg-white bg-opacity-10 rounded-lg p-3">
                  <div className="text-sm font-semibold mb-2">📍 العيادة الحالية</div>
                  <div className="text-lg font-bold mb-2">{currentClinic.nameAr}</div>
                  {position !== null && position >= 0 && (
                    <>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm">رقمك:</span>
                        <span className="text-2xl font-bold">{yourNumber}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm">موقعك في الطابور:</span>
                        <span className="text-xl font-bold">{position === 0 ? 'دورك الآن!' : position}</span>
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* العيادة التالية */}
              {nextClinic && (
                <div className="bg-white bg-opacity-10 rounded-lg p-3">
                  <div className="text-sm font-semibold mb-2">⏭️ العيادة التالية</div>
                  <div className="text-base font-bold">{nextClinic.nameAr}</div>
                </div>
              )}

              {/* التعليمات */}
              <div className="bg-white bg-opacity-10 rounded-lg p-3">
                <div className="text-sm font-semibold mb-2">💡 تعليمات</div>
                <ul className="text-sm space-y-1 opacity-95">
                  {position === 0 ? (
                    <li>🔴 <strong>توجه للعيادة فوراً</strong></li>
                  ) : position === 1 ? (
                    <>
                      <li>⚠️ أنت التالي - كن جاهزاً</li>
                      <li>📄 جهز أوراقك ومستنداتك</li>
                    </>
                  ) : position === 2 ? (
                    <>
                      <li>⏰ اقترب دورك - استعد</li>
                      <li>📍 تأكد من تواجدك قرب العيادة</li>
                    </>
                  ) : position === 3 ? (
                    <>
                      <li>📢 قريباً سيحين دورك</li>
                      <li>⏱️ انتظر الإشعار التالي</li>
                    </>
                  ) : (
                    <>
                      <li>✅ ستتلقى إشعار عند اقتراب دورك</li>
                      <li>🔔 تأكد من تفعيل الإشعارات</li>
                    </>
                  )}
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* زر إظهار الدليل */}
      {!showGuide && (
        <button
          onClick={() => setShowGuide(true)}
          className="fixed bottom-6 right-6 z-40 bg-gradient-to-br from-purple-600 to-indigo-700 text-white p-4 rounded-full shadow-2xl hover:scale-110 transition-transform"
          title="إظهار دليل المراجع"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </button>
      )}

      {/* الأنيميشن */}
      <style>{`
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
        
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: scale(0.9);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }
      `}</style>
    </div>
  );
}


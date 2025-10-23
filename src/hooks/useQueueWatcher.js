// 🧠 Queue Watcher Hook with Auto-Recovery
// Hook ذكي لمراقبة الطوابير مع إصلاح تلقائي

import { useEffect, useRef } from 'react';
import { GENERAL_REFRESH_INTERVAL, NEAR_TURN_REFRESH_INTERVAL } from '../core/config/refresh.constants';

const MAX_RETRY = 3;
const RECOVERY_DELAY = 5000; // 5 ثواني

export default function useQueueWatcher({ 
  fetchFunction, 
  onSuccess, 
  onError,
  enabled = true,
  useNearTurnInterval = false 
}) {
  const retryCountRef = useRef(0);
  const lastStateRef = useRef(null);
  const timerRef = useRef(null);

  useEffect(() => {
    if (!enabled) return;

    const interval = useNearTurnInterval ? NEAR_TURN_REFRESH_INTERVAL : GENERAL_REFRESH_INTERVAL;

    const safeFetch = async () => {
      // تخطي التحديث إذا كانت الصفحة في الخلفية
      if (document.hidden) return;

      try {
        const newState = await fetchFunction();
        
        // تجنب التحديثات المكررة
        if (JSON.stringify(newState) === JSON.stringify(lastStateRef.current)) {
          return;
        }
        
        lastStateRef.current = newState;
        retryCountRef.current = 0; // نجاح – إعادة العداد
        
        if (onSuccess) {
          onSuccess(newState);
        }
      } catch (err) {
        console.warn('⚠️ فشل في تحديث الدور:', err.message);
        retryCountRef.current++;
        
        if (onError) {
          onError(err);
        }
        
        if (retryCountRef.current <= MAX_RETRY) {
          // إعادة المحاولة بعد تأخير
          setTimeout(safeFetch, RECOVERY_DELAY);
        } else {
          console.error('⚠️ فشل التحديث بعد 3 محاولات - الاعتماد على SSE');
          // إعادة تعيين العداد والانتظار على SSE
          retryCountRef.current = 0;
        }
      }
    };

    // تحديث فوري
    safeFetch();
    
    // تحديث دوري
    timerRef.current = setInterval(safeFetch, interval);

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [fetchFunction, onSuccess, onError, enabled, useNearTurnInterval]);

  return {
    retryCount: retryCountRef.current,
    lastState: lastStateRef.current
  };
}


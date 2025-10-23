// 🧠 Unified Update Logic — Stable Version
// Hook موحد لإدارة التحديثات عبر SSE أو Polling

import { useEffect, useRef } from "react";
import eventBus from '../core/event-bus.js';

export default function useSmartUpdater({ url, onData, interval = 60000, useSSE = true }) {
  const timerRef = useRef(null);
  const unsubscribeRef = useRef(null);

  useEffect(() => {
    if (useSSE) {
      // ✅ استخدام eventBus بدلاً من EventSource المكرر
      const handleEvent = (data) => {
        onData(data);
      };
      
      // الاشتراك في الأحداث من eventBus
      unsubscribeRef.current = eventBus.on('*', handleEvent);
    } else {
      // 🕒 Polling خفيف للصفحات غير الحرجة
      const poll = async () => {
        try {
          const res = await fetch(url, { cache: "no-store" });
          if (res.ok) onData(await res.json());
        } catch (_) {}
      };
      poll();
      timerRef.current = setInterval(poll, interval);
    }

    return () => {
      if (unsubscribeRef.current) unsubscribeRef.current();
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [url, onData, interval, useSSE]);
}


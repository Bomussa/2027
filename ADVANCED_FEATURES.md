# الميزات المتقدمة الجديدة - Advanced Features

## تاريخ التحديث: 20 أكتوبر 2025

---

## 🔔 نظام الإشعارات المتقدم (Advanced Notification System)

### الميزات الرئيسية:

#### 1. **إشعارات فورية عبر SSE (Server-Sent Events)**
- اتصال مباشر ومستمر بين الخادم والعميل
- تسليم الإشعارات في الوقت الفعلي بدون تأخير
- إعادة الاتصال التلقائي عند انقطاع الاتصال

#### 2. **نظام أولويات ذكي**
- **عاجل (Urgent)**: حان دورك الآن - صوت مزدوج + اهتزاز
- **عالي (High)**: اقترب دورك - صوت بسيط
- **عادي (Normal)**: تحديثات عامة
- **منخفض (Low)**: معلومات إضافية

#### 3. **تنبؤ دقيق بوقت الانتظار**
- حساب تلقائي للوقت المتوقع بناءً على:
  - عدد المنتظرين أمامك
  - متوسط وقت الخدمة لكل عيادة
  - موقعك الحالي في الطابور

#### 4. **إشعارات متعددة المستويات**
- **الموقع 1**: "🔔 حان دورك الآن!" - توجه فوراً
- **الموقع 2**: "⏰ أنت التالي!" - كن جاهزاً
- **الموقع 3**: "⏳ اقترب دورك جداً" - ابق قريباً
- **الموقع 4-5**: "⏰ اقترب دورك" - توجه نحو منطقة الانتظار
- **الموقع 6-10**: تحديثات دورية
- **الموقع 11+**: تحديثات كل 5 مواقع

#### 5. **نظام صوتي بسيط**
- نغمة "تيط" بسيطة للإشعارات
- مدة النغمة تعتمد على الأولوية
- بدون تعقيدات أو أصوات مزعجة

### APIs الجديدة:

#### 1. إرسال إشعار
```
POST /api/v1/notifications/send
Body: {
  "recipient_id": "user123",
  "recipient_type": "patient",
  "type": "your_turn",
  "title": "حان دورك",
  "message": "توجه للعيادة",
  "priority": "urgent",
  "channels": ["sse", "browser", "sound", "vibrate"]
}
```

#### 2. جلب الإشعارات
```
GET /api/v1/notifications/get?recipient_type=patient&recipient_id=user123&limit=20
```

#### 3. تحديد كمقروء
```
POST /api/v1/notifications/mark-read
Body: {
  "recipient_id": "user123",
  "mark_all": true
}
```

#### 4. إشعارات تلقائية للطابور
```
POST /api/v1/queue/auto-notify
Body: {
  "clinic": "internal"
}
```

#### 5. إشعارات ذكية مع تنبؤ
```
POST /api/v1/notifications/smart-notify
Body: {
  "clinic": "internal",
  "user_id": "user123"  // اختياري
}
```

#### 6. SSE للإشعارات الفورية
```
GET /api/v1/events/notifications?recipient_type=patient&recipient_id=user123
```

---

## 🗺️ نظام المسارات الديناميكية (Dynamic Path Routing)

### الميزات الرئيسية:

#### 1. **حساب المسار مرة واحدة فقط**
- يتم حساب المسار في **بداية الفحص فقط**
- يُحفظ المسار (Sticky) طوال رحلة المريض
- لا يتغير المسار بعد الحساب الأول

#### 2. **توزيع ذكي حسب الأوزان**
- حساب عدد المنتظرين في كل عيادة
- أوزان أولوية لكل عيادة حسب نوع الفحص
- متوسط وقت الخدمة لكل عيادة
- **معادلة الحساب:**
  ```
  Score = (queue_length × priority_weight × avg_service_time) / 10
  ```
- اختيار المسار الأمثل (أقل Score)

#### 3. **قواعد إلزامية**
- المختبر (Lab) دائماً أولاً (إذا كان مطلوباً)
- الأشعة (X-ray) دائماً ثانياً (إذا كانت مطلوبة)
- باقي العيادات حسب الأوزان الديناميكية

#### 4. **أنواع الفحوصات المدعومة**

##### فحص التجنيد (recruitment)
- العيادات: المختبر، الأشعة، العيون، الباطنية، الأنف والأذن، الجلدية
- أوزان الأولوية مخصصة

##### فحص أساسي (basic)
- العيادات: المختبر، الأشعة، الباطنية
- مسار مختصر

##### فحص شامل (full)
- العيادات: جميع العيادات (8 عيادات)
- مسار كامل

##### فحص نساء (women)
- العيادات: المختبر، الأشعة، الباطنية نساء، الجلدية نساء، العيون نساء
- بدون PIN (no_pin: true)

##### فحص متخصص (specialized)
- العيادات: المختبر، الأشعة، الباطنية، العظام
- مسار متخصص

### APIs الجديدة:

#### 1. تعيين مسار ديناميكي
```
POST /api/v1/path/dynamic-assign
Body: {
  "user_id": "user123",
  "exam_type": "recruitment"
}

Response: {
  "success": true,
  "sticky": true,
  "session_code": "REC-user-abc123-xyz",
  "clinic_path": ["lab", "xray", "eyes", "internal", "ent", "derma"],
  "clinic_names": ["المختبر", "الأشعة", "العيون", "الباطنية", "الأنف والأذن", "الجلدية"],
  "weights_used": {
    "lab": 5,
    "xray": 3,
    "eyes": 8,
    "internal": 12,
    "ent": 6,
    "derma": 4
  },
  "total_estimated_time_minutes": 85,
  "total_estimated_time_text": "ساعة و 25 دقيقة",
  "message": "تم حساب المسار الأمثل بنجاح"
}
```

#### 2. تحليلات المسارات
```
GET /api/v1/path/analytics?date=2025-10-20

Response: {
  "success": true,
  "statistics": {
    "total_paths_assigned": 45,
    "by_exam_type": {
      "recruitment": 30,
      "basic": 10,
      "full": 5
    },
    "avg_estimated_time": 75,
    "avg_clinics_per_path": 5.2,
    "unique_users_count": 45
  },
  "current_queue_weights": {
    "lab": 5,
    "xray": 3,
    ...
  }
}
```

#### 3. اختيار مسار (نسخة محسنة)
```
GET /api/v1/path/choose-v2?exam=recruitment&user=user123
```

---

## 📊 التكامل مع النظام الحالي

### 1. تحديثات على queue/enter.js
- إضافة استدعاء تلقائي لـ `auto-notify` عند دخول طابور جديد
- إرسال إشعارات فورية لجميع المنتظرين

### 2. مكون React جديد
- `AdvancedNotificationPanel.jsx` - لوحة إشعارات متقدمة
- اتصال SSE مباشر
- عرض الإشعارات في الوقت الفعلي
- تشغيل الصوت البسيط تلقائياً

### 3. ملفات مساعدة
- `simple-beep.js` - نظام صوتي بسيط
- نغمة واحدة بسيطة "تيط"
- مدة متغيرة حسب الأولوية

---

## 🎯 الاستخدام الموصى به

### للمرضى:
1. عند تسجيل الدخول، يتم حساب المسار الأمثل تلقائياً
2. يتلقى المريض إشعارات فورية عن موقعه في الطابور
3. تنبيهات صوتية بسيطة عند اقتراب الدور
4. معلومات دقيقة عن الوقت المتوقع

### للإدارة:
1. مراقبة توزيع المرضى على العيادات
2. تحليلات يومية للمسارات
3. إحصائيات الأوزان الحالية
4. تقارير الأداء

---

## 🔧 الملفات الجديدة

### Backend (Functions):
- `/functions/api/v1/notifications/send.js`
- `/functions/api/v1/notifications/get.js`
- `/functions/api/v1/notifications/mark-read.js`
- `/functions/api/v1/events/notifications.js`
- `/functions/api/v1/queue/auto-notify.js`
- `/functions/api/v1/notifications/smart-notify.js`
- `/functions/api/v1/path/dynamic-assign.js`
- `/functions/api/v1/path/analytics.js`
- `/functions/api/v1/path/choose-v2.js`

### Frontend (React):
- `/src/components/AdvancedNotificationPanel.jsx`
- `/src/utils/simple-beep.js`

---

## ✅ الاختبار

### اختبار نظام الإشعارات:
```bash
# إرسال إشعار تجريبي
curl -X POST https://www.mmc-mms.com/api/v1/notifications/send \
  -H "Content-Type: application/json" \
  -d '{
    "recipient_id": "test123",
    "type": "your_turn",
    "title": "اختبار",
    "message": "هذا إشعار تجريبي",
    "priority": "urgent"
  }'

# جلب الإشعارات
curl "https://www.mmc-mms.com/api/v1/notifications/get?recipient_type=patient&recipient_id=test123"
```

### اختبار المسارات الديناميكية:
```bash
# تعيين مسار جديد
curl -X POST https://www.mmc-mms.com/api/v1/path/dynamic-assign \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": "test123",
    "exam_type": "recruitment"
  }'

# عرض التحليلات
curl "https://www.mmc-mms.com/api/v1/path/analytics?date=2025-10-20"
```

---

## 📝 ملاحظات مهمة

1. **النظام الصوتي**: نغمة بسيطة فقط، بدون تعقيدات
2. **المسار الديناميكي**: يُحسب مرة واحدة فقط في البداية
3. **الإشعارات**: فورية عبر SSE، بدون polling
4. **الأوزان**: ديناميكية حسب الوقت الفعلي
5. **التوافق**: متوافق مع النظام الحالي بالكامل

---

## 🚀 الإصدار: v2.0 - Advanced Features
**تاريخ الإصدار**: 20 أكتوبر 2025  
**المطور**: Manus AI  
**الحالة**: جاهز للنشر ✅


# خطة التوحيد الشاملة لمشاريع MMC-MMS على Cloudflare

## الوضع الحالي

لديك **3 مشاريع منفصلة** في Cloudflare:

### 1. مشروع **2027** (Cloudflare Pages)
- النطاق: `2027-5a0.pages.dev` + نطاق آخر
- المستودع: `Bomussa/2027`
- الوظيفة: Frontend + Functions

### 2. مشروع **mms-api-proxy** (Cloudflare Worker)
- المسارات: `api.mmc-mms.com` + 2 مسارات أخرى
- الوظيفة: API Proxy

### 3. مشروع **mmc-mms** (Cloudflare Pages)
- النطاق: `mmc-mms.com/*`
- الوظيفة: الموقع الرئيسي

## المطلوب: توحيد في مشروع واحد

### الهدف
دمج المشاريع الثلاثة في **مشروع Pages واحد** يسمى `mmc-mms-2027` يحتوي على:
- Frontend (من مستودع 2027)
- Backend API Functions (دمج mms-api-proxy)
- النطاق الرئيسي: `mmc-mms.com`

## خطة التنفيذ

### المرحلة 1: إعداد البنية الموحدة

#### 1.1 تحديث wrangler.toml
```toml
name = "mmc-mms-2027"
compatibility_date = "2025-10-18"
pages_build_output_dir = "dist"

# KV Namespaces - استخدام MMS_KV كـ binding موحد
[[kv_namespaces]]
binding = "MMS_KV"
id = "fd4470d6a7f34709b3486b1ab0ade4e7"

[[kv_namespaces]]
binding = "KV_PINS"
id = "7d71bfe9e606486f9124400a4f3c34e2"

[[kv_namespaces]]
binding = "KV_QUEUES"
id = "046e391c8e6d4120b3619fa69456fc72"

[[kv_namespaces]]
binding = "KV_EVENTS"
id = "250f2f79e4fe4d42b1db529123a3f5a1"

# D1 Database
[[d1_databases]]
binding = "MMS_DB"
database_name = "mms_d1"
database_id = "سيتم إنشاؤه"

[vars]
TIMEZONE = "Asia/Qatar"
PIN_SECRET = "6a1f1a07787035f332b188d623a6395dc50de51bf90a62238ed25b5519ca3194"
JWT_SECRET = "ff8d89d5d43df95e470553e76f3c4ca18f651ad4fdc6ab86b256f4883e6aa220"
NOTIFY_KEY = "https://notify.mmc-mms.com/webhook"
SITE_ORIGIN = "https://mmc-mms.com"
API_BASE_URL = "https://mmc-mms.com/api/v1"
```

#### 1.2 بنية المجلدات
```
2027/
├── dist/                    # Frontend build output
├── functions/               # Cloudflare Pages Functions (Backend API)
│   ├── _middleware.js       # Global middleware
│   ├── api/
│   │   └── v1/
│   │       ├── patient/
│   │       │   └── login.js
│   │       ├── queue/
│   │       │   ├── enter.js
│   │       │   ├── status.js
│   │       │   ├── call.js
│   │       │   └── done.js
│   │       ├── pin/
│   │       │   └── status.js
│   │       ├── events/
│   │       │   └── stream.js    # SSE endpoint
│   │       └── health/
│   │           └── status.js
│   └── admin/
│       └── login.js
├── src/                     # Frontend source
├── wrangler.toml
└── package.json
```

### المرحلة 2: إنشاء D1 Database

#### 2.1 إنشاء قاعدة البيانات
```bash
wrangler d1 create mms_d1
```

#### 2.2 تطبيق Schema
```sql
CREATE TABLE IF NOT EXISTS patients (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  military_id TEXT UNIQUE NOT NULL,
  name TEXT,
  gender TEXT,
  neighborhood TEXT,
  exam_type TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS clinics (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  code TEXT UNIQUE NOT NULL,
  floor INTEGER,
  weight INTEGER DEFAULT 1
);

CREATE TABLE IF NOT EXISTS queues (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  clinic_id INTEGER NOT NULL,
  patient_id INTEGER NOT NULL,
  number INTEGER NOT NULL,
  status TEXT DEFAULT 'waiting',
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT,
  FOREIGN KEY (clinic_id) REFERENCES clinics(id),
  FOREIGN KEY (patient_id) REFERENCES patients(id)
);

CREATE TABLE IF NOT EXISTS pins (
  clinic_id INTEGER NOT NULL,
  pin_code TEXT NOT NULL,
  generated_for TEXT NOT NULL,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (clinic_id, generated_for)
);

CREATE TABLE IF NOT EXISTS stats (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  clinic_id INTEGER NOT NULL,
  date TEXT NOT NULL,
  total_seen INTEGER DEFAULT 0,
  avg_time REAL DEFAULT 0,
  FOREIGN KEY (clinic_id) REFERENCES clinics(id)
);

CREATE TABLE IF NOT EXISTS routes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  patient_id INTEGER NOT NULL,
  step_order INTEGER NOT NULL,
  clinic_id INTEGER NOT NULL,
  status TEXT DEFAULT 'pending',
  started_at TEXT,
  completed_at TEXT,
  FOREIGN KEY (patient_id) REFERENCES patients(id),
  FOREIGN KEY (clinic_id) REFERENCES clinics(id)
);
```

### المرحلة 3: تحديث Middleware

#### 3.1 functions/_middleware.js
```javascript
export async function onRequest(context) {
  const { request, next, env } = context;
  
  // CORS Headers
  const corsHeaders = {
    'Access-Control-Allow-Origin': 'https://mmc-mms.com',
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
    'Access-Control-Allow-Headers': 'Authorization,Content-Type',
    'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload',
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'Referrer-Policy': 'strict-origin-when-cross-origin'
  };

  // Handle OPTIONS
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: corsHeaders
    });
  }

  // Continue to next handler
  const response = await next();
  
  // Add CORS headers to response
  Object.entries(corsHeaders).forEach(([key, value]) => {
    response.headers.set(key, value);
  });

  return response;
}
```

### المرحلة 4: تحديث API Endpoints

جميع endpoints في `functions/api/v1/` يجب أن:
1. تستخدم `env.MMS_DB` للوصول إلى D1
2. تستخدم `env.MMS_KV` للوصول إلى KV الموحد
3. تطبق Online-only mode (لا fallback للـ localStorage)
4. تعيد استجابات JSON صحيحة مع CORS headers

### المرحلة 5: SSE للإشعارات اللحظية

#### 5.1 functions/api/v1/events/stream.js
```javascript
export async function onRequest(context) {
  const { env } = context;
  
  // Create SSE stream
  const stream = new ReadableStream({
    async start(controller) {
      // Send initial connection message
      controller.enqueue(`data: ${JSON.stringify({ type: 'CONNECTED' })}\n\n`);
      
      // Keep-alive every 30 seconds
      const keepAlive = setInterval(() => {
        controller.enqueue(`: keep-alive\n\n`);
      }, 30000);
      
      // Listen for events from KV_EVENTS
      // Implementation depends on your event system
      
      return () => clearInterval(keepAlive);
    }
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive'
    }
  });
}
```

### المرحلة 6: النشر

#### 6.1 Build Frontend
```bash
npm run build
```

#### 6.2 Deploy to Cloudflare Pages
```bash
# عبر GitHub integration (موصى به)
git push origin main

# أو عبر wrangler
wrangler pages deploy dist --project-name=mmc-mms-2027
```

#### 6.3 ربط النطاق
في Cloudflare Dashboard:
1. Pages > mmc-mms-2027 > Custom domains
2. إضافة `mmc-mms.com`
3. إضافة `www.mmc-mms.com`

### المرحلة 7: حذف المشاريع القديمة

بعد التأكد من عمل المشروع الموحد:
1. حذف مشروع `mms-api-proxy` (Worker)
2. حذف مشروع `mmc-mms` القديم (Pages)
3. الاحتفاظ بـ `2027` كنسخة احتياطية أو حذفه

## الاختبار

### اختبارات API
```bash
# Health check
curl https://mmc-mms.com/api/v1/health/status

# Patient login
curl -X POST https://mmc-mms.com/api/v1/patient/login \
  -H "Content-Type: application/json" \
  -d '{"patientId":"12345","gender":"male"}'

# Queue status
curl https://mmc-mms.com/api/v1/queue/status?clinic=lab

# SSE stream
curl https://mmc-mms.com/api/v1/events/stream
```

### اختبارات Frontend
1. فتح `https://mmc-mms.com`
2. تسجيل دخول مريض
3. اختيار نوع الفحص
4. التحقق من تحديثات Queue في الوقت الفعلي
5. اختبار Admin login

## المراقبة والصيانة

### مراقبة ذاتية
- Health checks كل 30 ثانية
- تنبيهات عند فشل KV/D1/SSE
- Auto-restart عند الفشل

### النسخ الاحتياطي
- نسخ احتياطي يومي للـ D1 (2:00 AM Qatar time)
- نسخ احتياطي للـ KV data
- Git backup للكود

### Scheduled Jobs (CRON)
```javascript
// في Cloudflare Dashboard > Pages > Settings > Functions
// أو عبر wrangler.toml

export async function scheduled(event, env, ctx) {
  const hour = new Date().getHours();
  
  // Daily PIN reset (00:00)
  if (hour === 0) {
    await resetDailyPins(env);
  }
  
  // Nightly backup (02:00)
  if (hour === 2) {
    await performBackup(env);
  }
  
  // Hourly canary test
  await runCanaryTest(env);
}
```

## النتيجة النهائية

✅ مشروع واحد موحد: `mmc-mms-2027`
✅ Frontend + Backend في مكان واحد
✅ D1 Database للبيانات الدائمة
✅ KV للبيانات السريعة
✅ SSE للإشعارات اللحظية
✅ Online-only mode
✅ مراقبة ذاتية
✅ نسخ احتياطي تلقائي
✅ لا حاجة للعودة إلى Cloudflare Dashboard


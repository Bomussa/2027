# دليل نشر الواجهة الأمامية على Cloudflare Pages
# Cloudflare Pages Deployment Guide

## نظرة عامة | Overview

تم تكوين المشروع للنشر التلقائي على Cloudflare Pages باستخدام GitHub Actions. الواجهة الأمامية الصحيحة تتضمن:

The project is configured for automatic deployment to Cloudflare Pages using GitHub Actions. The correct frontend includes:

### الواجهات المتوفرة | Available Interfaces

1. **صفحة دخول المراجع** | Reviewer Login Page
   - إدخال الرقم الشخصي/العسكري
   - اختيار الجنس (ذكر/أنثى)
   - خيار اللغة (عربي/إنجليزي)

2. **صفحة اختيار نوع الفحص** | Exam Type Selection Page
   - 8 أنواع من الفحوصات الطبية:
     - فحص التجنيد (Recruitment)
     - فحص الترفيع (Promotion)
     - فحص النقل (Transfer)
     - فحص التحويل (Referral)
     - تجديد التعاقد (Contract Renewal)
     - فحص الطيران السنوي (Aviation Annual)
     - فحص الطباخين (Cooks)
     - الدورات الداخلية والخارجية (Courses)

3. **شاشات العيادات (4+ عيادات)** | Clinic Screens (4+ Clinics)
   الشاشة الرئيسية للمراجع تحتوي على:
   - المختبر والأشعة (Lab & Radiology)
   - القياسات الحيوية (Vital Signs)
   - عيادة العيون (Ophthalmology)
   - عيادة الباطنية (Internal Medicine)
   - عيادة الجراحة (Surgery)
   - عيادة العظام (Orthopedics)
   - عيادة أنف وأذن وحنجرة (ENT)
   - وغيرها حسب نوع الفحص والجنس

4. **واجهة الإدارة** | Admin Interface
   - تسجيل دخول باسم المستخدم وكلمة المرور
   - لوحة تحكم شاملة
   - إدارة الطوابير
   - إحصائيات ومراقبة

## متطلبات النشر | Deployment Requirements

### 1. GitHub Secrets

يجب إضافة المفاتيح التالية في إعدادات Repository:

You need to add the following secrets in Repository Settings:

```
Settings → Secrets and variables → Actions → New repository secret
```

**المطلوب:**
- `CLOUDFLARE_API_TOKEN`: رمز API من Cloudflare
- `CLOUDFLARE_ACCOUNT_ID`: معرّف الحساب من Cloudflare

### 2. الحصول على CLOUDFLARE_API_TOKEN

1. سجل الدخول إلى [Cloudflare Dashboard](https://dash.cloudflare.com)
2. اذهب إلى: Profile → API Tokens
3. انقر على "Create Token"
4. استخدم قالب "Edit Cloudflare Workers"
5. أو أنشئ Custom Token مع الصلاحيات:
   - Account → Cloudflare Pages → Edit
   - Zone → Zone → Read
6. انسخ الرمز وأضفه كـ Secret في GitHub

### 3. الحصول على CLOUDFLARE_ACCOUNT_ID

1. سجل الدخول إلى [Cloudflare Dashboard](https://dash.cloudflare.com)
2. افتح Workers & Pages
3. انسخ Account ID من الشريط الجانبي

## عملية النشر التلقائي | Automatic Deployment Process

### يتم النشر تلقائياً عند:
- Push إلى فرع `main`
- Push إلى فرع `copilot/deploy-correct-frontend`
- إنشاء Pull Request

### خطوات النشر التلقائي:
1. ✅ تثبيت Node.js والتبعيات
2. ✅ بناء التطبيق بواسطة Vite
3. ✅ نشر مجلد `dist` على Cloudflare Pages
4. ✅ نشر URL في تعليقات PR

## البناء المحلي | Local Build

لاختبار البناء محلياً قبل النشر:

```bash
# تثبيت التبعيات
npm install

# بناء المشروع
npm run build

# معاينة البناء
npm run preview
```

### محتويات مجلد dist بعد البناء:
```
dist/
├── index.html          # ملف HTML الرئيسي مع React
├── assets/             # ملفات CSS و JS المُجمّعة
├── logo.jpeg           # شعار الخدمات الطبية
├── manifest.webmanifest
├── notification.mp3
└── ... (باقي الأصول من public/)
```

## التحقق من النشر | Verify Deployment

بعد النشر، تحقق من:

1. **صفحة الدخول**: يجب أن تظهر واجهة React الصحيحة
2. **تبديل اللغة**: يجب أن يعمل زر English/العربية
3. **تبديل الثيم**: يجب أن تعمل الثيمات الستة
4. **دخول الإدارة**: يجب أن يظهر نموذج دخول الإدارة عند النقر على زر "الإدارة"
5. **الاستجابة**: يجب أن تعمل الواجهة على جميع أحجام الشاشات

## استكشاف الأخطاء | Troubleshooting

### مشكلة: Build فشل في GitHub Actions
**الحل**: تحقق من:
- صحة package.json وجميع التبعيات مثبتة
- لا توجد أخطاء في الكود
- راجع سجلات GitHub Actions

### مشكلة: النشر فشل على Cloudflare
**الحل**: تحقق من:
- صحة CLOUDFLARE_API_TOKEN
- صحة CLOUDFLARE_ACCOUNT_ID
- اسم المشروع في wrangler.toml هو "2027"

### مشكلة: الصفحة فارغة أو بيضاء
**الحل**:
- تأكد من أن البناء استخدم Vite وليس نسخ public فقط
- تحقق من Console في المتصفح للأخطاء
- تأكد من أن ملف dist/index.html يحتوي على روابط لملفات JS/CSS الصحيحة

## الملفات المهمة | Important Files

- `package.json`: تعريف التبعيات وأوامر البناء
- `vite.config.js`: تكوين Vite للبناء
- `wrangler.toml`: تكوين Cloudflare Pages
- `.github/workflows/cloudflare-pages.yml`: سير عمل GitHub Actions
- `src/`: مجلد الشفرة المصدرية للواجهة الأمامية (React)
- `public/`: الملفات الثابتة (الشعار، الأيقونات، الخ)

## روابط مفيدة | Useful Links

- [Cloudflare Pages Documentation](https://developers.cloudflare.com/pages/)
- [Vite Documentation](https://vitejs.dev/)
- [GitHub Actions Documentation](https://docs.github.com/en/actions)

---

**تم التكوين بواسطة**: GitHub Copilot  
**التاريخ**: 2025-10-16  
**الإصدار**: 1.0

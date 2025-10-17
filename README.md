# نظام اللجنة الطبية العسكرية — دليل المشروع (2026)

![Deploy](https://github.com/Bomussa/2027/workflows/Deploy%20to%20Cloudflare%20Pages/badge.svg)
![Health Check](https://github.com/Bomussa/2027/workflows/Health%20Check%20and%20Auto-Repair/badge.svg)
![Monitoring](https://github.com/Bomussa/2027/workflows/Monitoring%20and%20Logging/badge.svg)

هذه الصفحة تربطك بالمذكرة الأساسية التي تشرح بنية التطبيق كاملة، المسارات، تدفق البيانات، التشغيل والنشر. تم إعدادها لتسهيل الصيانة والإصلاح المستقبلي.

روابط أساسية:
- وثيقة المعمارية الشاملة: `docs/ARCHITECTURE.md`
- مرجع المسارات وواجهات الـ API: `docs/ROUTES.md`
- تخزين البيانات والبنية الدائمة: `docs/DATA_STORAGE.md`
- التشغيل والعمليات (تشغيل محلي/صحة/نشر): `docs/OPERATIONS.md`

تشغيل محلي مختصر:
- تثبيت الاعتمادات: npm install
- تشغيل الواجهة dev: npm run dev
- بناء الإنتاج: npm run build
- تشغيل الخادم: npm run start

لمزيد من التفاصيل راجع المستندات أعلاه.

## CI/CD والنشر التلقائي

يتضمن المشروع نظام CI/CD متكامل للنشر على Cloudflare Pages:

- 🚀 **النشر التلقائي**: يتم النشر تلقائياً عند Push إلى main/develop
- 🏥 **فحص الصحة**: فحص دوري كل ساعة للتأكد من عمل الموقع
- 🔄 **الإصلاح التلقائي**: إصلاح تلقائي للمشاكل وإعادة النشر
- 📊 **المراقبة والسجلات**: جمع القياسات وتوليد التقارير
- 🤖 **الدمج التلقائي**: دمج PRs تلقائياً بعد نجاح الاختبارات

لمزيد من المعلومات، راجع: `CI_CD_DOCUMENTATION.md`

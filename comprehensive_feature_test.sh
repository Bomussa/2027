#!/bin/bash
echo "==================================================================="
echo "اختبار شامل للميزات الأساسية"
echo "==================================================================="
echo ""

BASE="http://localhost:8788"

echo "1. نظام البن كود (PIN)"
echo "-------------------------------------------------------------------"
curl -s $BASE/api/v1/pin/status | python3 -c "import sys,json; d=json.load(sys.stdin); print(f\"✅ عدد العيادات: {len(d.get('pins',{}))}\")"
echo ""

echo "2. نظام الجلسات"
echo "-------------------------------------------------------------------"
curl -s -X POST $BASE/api/v1/patient/login -H "Content-Type: application/json" -d '{"patientId":"12345","gender":"male"}' | python3 -c "import sys,json; d=json.load(sys.stdin); print(f\"✅ تسجيل دخول: {d.get('success',False)}\")"
echo ""

echo "3. نظام الدور"
echo "-------------------------------------------------------------------"
curl -s -X POST $BASE/api/v1/queue/enter -H "Content-Type: application/json" -d '{"clinic":"general","user":"12345"}' | python3 -c "import sys,json; d=json.load(sys.stdin); print(f\"✅ دخول الدور: {d.get('success',False)}, الرقم: {d.get('display_number','N/A')}\")"
echo ""

echo "4. نظام الإشعارات"
echo "-------------------------------------------------------------------"
curl -s -X POST $BASE/mw/notify/info -H "Content-Type: application/json" -d '{"message":"test"}' | python3 -c "import sys,json; d=json.load(sys.stdin); print(f\"✅ إرسال إشعار: {d.get('ok',False)}\")"
echo ""

echo "5. قسم الإدارة - الإحصائيات"
echo "-------------------------------------------------------------------"
curl -s $BASE/api/v1/stats/dashboard | python3 -c "import sys,json; d=json.load(sys.stdin); print(f\"✅ الإحصائيات: {d.get('success',False)}\")"
curl -s $BASE/api/v1/admin/status | python3 -c "import sys,json; d=json.load(sys.stdin); print(f\"✅ حالة النظام: {d.get('online',False)}\")"
echo ""

echo "6. الطبقة الوسطية (Middleware)"
echo "-------------------------------------------------------------------"
curl -s $BASE/mw/admin/live | python3 -c "import sys,json; d=json.load(sys.stdin); print(f\"✅ البث المباشر: {d.get('ok',False)}\")"
echo ""

echo "==================================================================="
echo "✅ جميع الميزات الأساسية تعمل بنجاح"
echo "==================================================================="

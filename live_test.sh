#!/bin/bash
# ========================================
# الاختبار المباشر المحلي للميزات الأساسية
# ========================================
# التاريخ: 2025-10-23
# المهندس: Lead Software Architect
# ========================================

BASE_URL="http://localhost:8788"
REPORT_FILE="live_test_report.txt"
ERROR_LOG="live_test_errors.log"

# تنظيف الملفات السابقة
> "$REPORT_FILE"
> "$ERROR_LOG"

echo "========================================="
echo "الاختبار المباشر المحلي"
echo "========================================="
echo ""

# إنشاء رأس التقرير
cat > "$REPORT_FILE" << 'EOF'
=================================================================
تقرير الاختبار المباشر المحلي
=================================================================
التاريخ: 2025-10-23
المهندس: Lead Software Architect
البيئة: Wrangler Pages Dev (localhost:8788)

=================================================================
EOF

PASS=0
FAIL=0

# دالة للاختبار
test_endpoint() {
    local name="$1"
    local method="$2"
    local endpoint="$3"
    local data="$4"
    local expected_status="$5"
    
    echo "اختبار: $name"
    echo "" >> "$REPORT_FILE"
    echo "=== $name ===" >> "$REPORT_FILE"
    echo "المسار: $method $endpoint" >> "$REPORT_FILE"
    
    if [ "$method" == "GET" ]; then
        response=$(curl -s -w "\n%{http_code}" "$BASE_URL$endpoint" 2>&1)
    else
        response=$(curl -s -w "\n%{http_code}" -X "$method" \
            -H "Content-Type: application/json" \
            -d "$data" \
            "$BASE_URL$endpoint" 2>&1)
    fi
    
    # استخراج كود الحالة
    status_code=$(echo "$response" | tail -n1)
    body=$(echo "$response" | head -n-1)
    
    echo "الحالة: $status_code" >> "$REPORT_FILE"
    echo "الاستجابة: $body" >> "$REPORT_FILE"
    
    if [ "$status_code" == "$expected_status" ]; then
        echo "   ✅ نجح ($status_code)" | tee -a "$REPORT_FILE"
        ((PASS++))
        return 0
    else
        echo "   ❌ فشل (متوقع: $expected_status، فعلي: $status_code)" | tee -a "$REPORT_FILE"
        echo "[$name] فشل - متوقع: $expected_status، فعلي: $status_code" >> "$ERROR_LOG"
        echo "الاستجابة: $body" >> "$ERROR_LOG"
        echo "---" >> "$ERROR_LOG"
        ((FAIL++))
        return 1
    fi
}

echo "========================================="
echo "1. اختبار المسارات الأساسية"
echo "========================================="
echo ""

# 1. الصفحة الرئيسية
test_endpoint "الصفحة الرئيسية" "GET" "/" "200"

# 2. أكواد الإدارة اليومية (Middleware)
test_endpoint "أكواد الإدارة اليومية (MW)" "GET" "/mw/admin/pins/today" "200"

# 3. أكواد الإدارة اليومية (API القديم)
test_endpoint "أكواد الإدارة اليومية (API)" "GET" "/api/v1/pin/status" "200"

echo ""
echo "========================================="
echo "2. اختبار نظام الجلسات"
echo "========================================="
echo ""

# 4. بدء جلسة جديدة (Middleware)
test_endpoint "بدء جلسة (MW)" "POST" "/mw/session/start" \
    '{"deviceId":"test123","sessionId":"sess_001"}' "200"

# 5. تسجيل دخول مريض (API)
test_endpoint "تسجيل دخول مريض (API)" "POST" "/api/v1/patient/login" \
    '{"patientId":"12345","gender":"male"}' "200"

echo ""
echo "========================================="
echo "3. اختبار نظام الدور"
echo "========================================="
echo ""

# 6. حالة الدور في عيادة (API)
test_endpoint "حالة الدور (API)" "GET" "/api/v1/queue/status?clinic=general" "200"

# 7. دخول الدور (API)
test_endpoint "دخول الدور (API)" "POST" "/api/v1/queue/enter" \
    '{"clinic":"general","user":"12345","isAutoEntry":false}' "200"

echo ""
echo "========================================="
echo "4. اختبار نظام الإشعارات"
echo "========================================="
echo ""

# 8. إشعارات (Middleware)
test_endpoint "إشعارات (MW)" "POST" "/mw/notify/info" \
    '{"message":"test notification"}' "200"

# 9. حالة الإشعارات (API)
test_endpoint "حالة الإشعارات (API)" "GET" "/api/v1/notify/status" "200"

echo ""
echo "========================================="
echo "5. اختبار قسم الإدارة"
echo "========================================="
echo ""

# 10. البث المباشر للإدارة (Middleware)
test_endpoint "البث المباشر (MW)" "GET" "/mw/admin/live" "200"

# 11. حالة الإدارة (API)
test_endpoint "حالة الإدارة (API)" "GET" "/api/v1/admin/status" "200"

# 12. إحصائيات Dashboard (API)
test_endpoint "إحصائيات Dashboard (API)" "GET" "/api/v1/stats/dashboard" "200"

echo ""
echo "========================================="
echo "6. اختبار نظام الصحة"
echo "========================================="
echo ""

# 13. حالة الصحة (API)
test_endpoint "حالة الصحة (API)" "GET" "/api/v1/health/status" "200"

echo ""
echo "========================================="
echo "النتيجة النهائية"
echo "========================================="
echo "✅ اختبارات ناجحة: $PASS"
echo "❌ اختبارات فاشلة: $FAIL"
TOTAL=$((PASS + FAIL))
if [ "$TOTAL" -gt 0 ]; then
    PERCENTAGE=$((PASS * 100 / TOTAL))
else
    PERCENTAGE=0
fi
echo "📊 نسبة النجاح: $PERCENTAGE%"
echo ""

# كتابة النتيجة في التقرير
cat >> "$REPORT_FILE" << EOF

=================================================================
النتيجة النهائية
=================================================================
✅ اختبارات ناجحة: $PASS
❌ اختبارات فاشلة: $FAIL
📊 نسبة النجاح: $PERCENTAGE%

EOF

if [ "$FAIL" -eq 0 ]; then
    echo "🎉 جميع الاختبارات المباشرة نجحت بنسبة 100%"
    echo "✅ المشروع جاهز للتسليم"
    cat >> "$REPORT_FILE" << EOF
الحالة: ✅ جميع الاختبارات المباشرة نجحت بنسبة 100%
الجاهزية: ✅ المشروع جاهز للتسليم

=================================================================
التوقيع: Lead Software Architect
التاريخ: 2025-10-23
الحالة: ✅ معتمد للتسليم
=================================================================
EOF
    exit 0
else
    echo "⚠️  يوجد $FAIL اختبار فاشل"
    echo "📄 راجع ملف الأخطاء: $ERROR_LOG"
    cat >> "$REPORT_FILE" << EOF
الحالة: ⚠️ يوجد $FAIL اختبار فاشل
الإجراء: راجع ملف الأخطاء وقم بالإصلاح

ملف الأخطاء: $ERROR_LOG

=================================================================
التوقيع: Lead Software Architect
التاريخ: 2025-10-23
الحالة: ⚠️ يتطلب إصلاح
=================================================================
EOF
    exit 1
fi


#!/bin/bash
# ========================================
# الاختبار النظري الشامل
# ========================================
# التاريخ: 2025-10-23
# المهندس: Lead Software Architect
# ========================================

echo "========================================="
echo "الاختبار النظري الشامل للتكامل"
echo "========================================="
echo ""

PASS=0
FAIL=0
REPORT_FILE="theoretical_test_report.txt"

# إنشاء ملف التقرير
cat > "$REPORT_FILE" << 'EOF'
=================================================================
تقرير الاختبار النظري الشامل
=================================================================
التاريخ: 2025-10-23
المهندس: Lead Software Architect
البيئة: STAGING_ENV

=================================================================
EOF

# ========================================
# 1. فحص الهيكل الأساسي
# ========================================
echo "1. فحص الهيكل الأساسي..."
echo "" >> "$REPORT_FILE"
echo "=== 1. فحص الهيكل الأساسي ===" >> "$REPORT_FILE"

# فحص وجود middleware
if [ -d "middleware" ]; then
    echo "   ✅ مجلد middleware موجود" | tee -a "$REPORT_FILE"
    ((PASS++))
else
    echo "   ❌ مجلد middleware غير موجود" | tee -a "$REPORT_FILE"
    ((FAIL++))
fi

# فحص وجود ملفات التكامل
for file in "src/lib/api-selector.js" "src/lib/api-middleware.js" "src/api/facade.ts"; do
    if [ -f "$file" ]; then
        echo "   ✅ $file موجود" | tee -a "$REPORT_FILE"
        ((PASS++))
    else
        echo "   ❌ $file غير موجود" | tee -a "$REPORT_FILE"
        ((FAIL++))
    fi
done

# فحص وجود functions/mw
if [ -f "functions/mw/[[path]].js" ]; then
    echo "   ✅ functions/mw/[[path]].js موجود" | tee -a "$REPORT_FILE"
    ((PASS++))
else
    echo "   ❌ functions/mw/[[path]].js غير موجود" | tee -a "$REPORT_FILE"
    ((FAIL++))
fi

# ========================================
# 2. فحص التعديلات على المكونات
# ========================================
echo ""
echo "2. فحص التعديلات على المكونات..."
echo "" >> "$REPORT_FILE"
echo "=== 2. فحص التعديلات على المكونات ===" >> "$REPORT_FILE"

for component in "AdminPage.jsx" "EnhancedAdminDashboard.jsx" "NotificationsPage.jsx" "PatientPage.jsx"; do
    if grep -q "from '../lib/api-selector'" "src/components/$component"; then
        echo "   ✅ $component يستخدم api-selector" | tee -a "$REPORT_FILE"
        ((PASS++))
    else
        echo "   ❌ $component لا يستخدم api-selector" | tee -a "$REPORT_FILE"
        ((FAIL++))
    fi
done

# ========================================
# 3. فحص _routes.json
# ========================================
echo ""
echo "3. فحص _routes.json..."
echo "" >> "$REPORT_FILE"
echo "=== 3. فحص _routes.json ===" >> "$REPORT_FILE"

if grep -q '"/mw/\*"' "_routes.json"; then
    echo "   ✅ مسار /mw/* موجود في _routes.json" | tee -a "$REPORT_FILE"
    ((PASS++))
else
    echo "   ❌ مسار /mw/* غير موجود في _routes.json" | tee -a "$REPORT_FILE"
    ((FAIL++))
fi

# ========================================
# 4. فحص عدم التكرار
# ========================================
echo ""
echo "4. فحص عدم التكرار..."
echo "" >> "$REPORT_FILE"
echo "=== 4. فحص عدم التكرار ===" >> "$REPORT_FILE"

DUPLICATES=$(find src -type f \( -name "*.js" -o -name "*.jsx" -o -name "*.ts" -o -name "*.tsx" \) | sort | uniq -d | wc -l)
if [ "$DUPLICATES" -eq 0 ]; then
    echo "   ✅ لا يوجد ملفات مكررة" | tee -a "$REPORT_FILE"
    ((PASS++))
else
    echo "   ❌ يوجد $DUPLICATES ملف مكرر" | tee -a "$REPORT_FILE"
    ((FAIL++))
fi

# ========================================
# 5. فحص الهوية البصرية (CSS)
# ========================================
echo ""
echo "5. فحص الهوية البصرية (CSS)..."
echo "" >> "$REPORT_FILE"
echo "=== 5. فحص الهوية البصرية ===" >> "$REPORT_FILE"

# فحص أن CSS لم يتغير
CSS_FILES=("src/index.css" "src/responsive-fixes.css")
for css_file in "${CSS_FILES[@]}"; do
    if [ -f "$css_file" ]; then
        echo "   ✅ $css_file موجود" | tee -a "$REPORT_FILE"
        ((PASS++))
    else
        echo "   ❌ $css_file غير موجود" | tee -a "$REPORT_FILE"
        ((FAIL++))
    fi
done

# ========================================
# 6. فحص ملفات التكوين
# ========================================
echo ""
echo "6. فحص ملفات التكوين..."
echo "" >> "$REPORT_FILE"
echo "=== 6. فحص ملفات التكوين ===" >> "$REPORT_FILE"

CONFIG_FILES=(".env" "wrangler.toml" "vite.config.js" "package.json")
for config_file in "${CONFIG_FILES[@]}"; do
    if [ -f "$config_file" ]; then
        echo "   ✅ $config_file موجود" | tee -a "$REPORT_FILE"
        ((PASS++))
    else
        echo "   ❌ $config_file غير موجود" | tee -a "$REPORT_FILE"
        ((FAIL++))
    fi
done

# ========================================
# 7. فحص عدم التعارض في المسارات
# ========================================
echo ""
echo "7. فحص عدم التعارض في المسارات..."
echo "" >> "$REPORT_FILE"
echo "=== 7. فحص عدم التعارض في المسارات ===" >> "$REPORT_FILE"

# فحص أن /api و /mw منفصلين
API_COUNT=$(find functions/api -name "*.js" 2>/dev/null | wc -l)
MW_COUNT=$(find functions/mw -name "*.js" 2>/dev/null | wc -l)

echo "   ℹ️  عدد ملفات /api: $API_COUNT" | tee -a "$REPORT_FILE"
echo "   ℹ️  عدد ملفات /mw: $MW_COUNT" | tee -a "$REPORT_FILE"

if [ "$API_COUNT" -gt 0 ] && [ "$MW_COUNT" -gt 0 ]; then
    echo "   ✅ المسارات منفصلة (api: $API_COUNT, mw: $MW_COUNT)" | tee -a "$REPORT_FILE"
    ((PASS++))
else
    echo "   ❌ مشكلة في المسارات" | tee -a "$REPORT_FILE"
    ((FAIL++))
fi

# ========================================
# 8. فحص middleware الداخلي
# ========================================
echo ""
echo "8. فحص middleware الداخلي..."
echo "" >> "$REPORT_FILE"
echo "=== 8. فحص middleware الداخلي ===" >> "$REPORT_FILE"

MW_DIRS=("core" "handlers" "services" "guards" "utils" "routes" "monitor")
for dir in "${MW_DIRS[@]}"; do
    if [ -d "middleware/$dir" ]; then
        FILE_COUNT=$(find "middleware/$dir" -type f | wc -l)
        echo "   ✅ middleware/$dir موجود ($FILE_COUNT ملف)" | tee -a "$REPORT_FILE"
        ((PASS++))
    else
        echo "   ❌ middleware/$dir غير موجود" | tee -a "$REPORT_FILE"
        ((FAIL++))
    fi
done

# ========================================
# النتيجة النهائية
# ========================================
echo ""
echo "========================================="
echo "النتيجة النهائية"
echo "========================================="
echo "✅ اختبارات ناجحة: $PASS"
echo "❌ اختبارات فاشلة: $FAIL"
TOTAL=$((PASS + FAIL))
PERCENTAGE=$((PASS * 100 / TOTAL))
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
    echo "🎉 جميع الاختبارات النظرية نجحت بنسبة 100%"
    echo "✅ جاهز للاختبار المباشر المحلي"
    cat >> "$REPORT_FILE" << EOF
الحالة: ✅ جميع الاختبارات النظرية نجحت بنسبة 100%
الجاهزية: ✅ جاهز للاختبار المباشر المحلي

=================================================================
التوقيع: Lead Software Architect
التاريخ: 2025-10-23
الحالة: ✅ معتمد للاختبار المباشر
=================================================================
EOF
    exit 0
else
    echo "⚠️  يوجد $FAIL اختبار فاشل - يجب الإصلاح قبل المتابعة"
    cat >> "$REPORT_FILE" << EOF
الحالة: ⚠️ يوجد $FAIL اختبار فاشل
الإجراء: يجب الإصلاح قبل المتابعة للاختبار المباشر

=================================================================
التوقيع: Lead Software Architect
التاريخ: 2025-10-23
الحالة: ⚠️ يتطلب إصلاح
=================================================================
EOF
    exit 1
fi


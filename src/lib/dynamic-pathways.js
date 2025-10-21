// المسارات الديناميكية الذكية - تعيد ترتيب العيادات حسب عدد المنتظرين الفعلي
import routeMap from '../../config/routeMap.json'
import clinicsData from '../../config/clinics.json'
import enhancedApi from './enhanced-api'

// تحويل رموز العيادات إلى كائنات كاملة
function mapClinicCodes(codes) {
  return codes.map(code => {
    const clinic = clinicsData[code]
    if (!clinic) {
      console.warn(`Clinic code ${code} not found in clinics.json`)
      return null
    }
    
    return {
      id: clinic.id.toLowerCase(),
      name: clinic.name,
      nameAr: clinic.name,
      floor: clinic.floor === 'M' ? 'الميزانين' : `الطابق ${clinic.floor}`,
      floorCode: clinic.floor,
      code: code
    }
  }).filter(Boolean)
}

// جلب عدد المنتظرين لجميع العيادات
async function getQueueLengths(clinicCodes) {
  const queueData = {}
  
  try {
    // جلب بيانات جميع العيادات بالتوازي
    const promises = clinicCodes.map(async (code) => {
      try {
        const clinic = clinicsData[code]
        if (!clinic) return null
        
        const clinicId = clinic.id.toLowerCase()
        const status = await enhancedApi.getQueueStatus(clinicId)
        
        if (status && status.success) {
          return {
            code,
            clinicId,
            waiting: status.total_waiting || 0,
            currentServing: status.current_serving || 0
          }
        }
      } catch (err) {
        console.warn(`Failed to fetch queue for ${code}:`, err)
      }
      return null
    })
    
    const results = await Promise.all(promises)
    
    results.forEach(result => {
      if (result) {
        queueData[result.code] = result.waiting
      }
    })
    
    console.log('📊 Queue lengths fetched:', queueData)
  } catch (err) {
    console.error('Failed to fetch queue lengths:', err)
  }
  
  return queueData
}

// إعادة ترتيب العيادات حسب عدد المنتظرين (الأقل أولاً)
function sortClinicsByQueue(clinics, queueData) {
  // العيادات الإلزامية التي يجب أن تبقى في البداية
  const mandatoryFirst = ['LAB', 'RAD'] // المختبر والأشعة دائماً أولاً
  
  const mandatory = []
  const optional = []
  
  clinics.forEach(clinic => {
    if (mandatoryFirst.includes(clinic.code)) {
      mandatory.push(clinic)
    } else {
      optional.push(clinic)
    }
  })
  
  // ترتيب المختبر والأشعة حسب عدد المنتظرين
  mandatory.sort((a, b) => {
    const aWaiting = queueData[a.code] || 0
    const bWaiting = queueData[b.code] || 0
    return aWaiting - bWaiting
  })
  
  // ترتيب باقي العيادات حسب عدد المنتظرين
  optional.sort((a, b) => {
    const aWaiting = queueData[a.code] || 0
    const bWaiting = queueData[b.code] || 0
    return aWaiting - bWaiting
  })
  
  // دمج القوائم: المختبر/الأشعة أولاً، ثم باقي العيادات مرتبة
  const sorted = [...mandatory, ...optional]
  
  console.log('🔄 Clinics sorted by queue length:', sorted.map(c => `${c.code}:${queueData[c.code] || 0}`))
  
  return sorted
}

// الحصول على المسار الطبي الديناميكي حسب نوع الفحص والجنس
export async function getDynamicMedicalPathway(examType, gender) {
  // تحويل examType من الإنجليزية إلى العربية
  const examTypeMap = {
    'recruitment': 'تجنيد',
    'promotion': 'ترفيع',
    'transfer': 'نقل',
    'referral': 'تحويل',
    'contract': 'تجديد التعاقد',
    'aviation': 'طيران سنوي',
    'cooks': 'طباخين',
    'courses': 'دورات'
  }
  
  const arabicExamType = examTypeMap[examType] || examType
  const route = routeMap[arabicExamType]
  
  if (!route) {
    console.warn(`No route found for exam type: ${examType} (${arabicExamType})`)
    return []
  }
  
  let clinicCodes = []
  
  // إذا كان المسار كائن (مثل نساء/عام)
  if (typeof route === 'object' && !Array.isArray(route)) {
    const genderKey = gender === 'female' ? 'F' : 'M'
    clinicCodes = route[genderKey] || route.M || []
  } else if (Array.isArray(route)) {
    // إذا كان المسار مصفوفة بسيطة
    clinicCodes = route
  }
  
  if (clinicCodes.length === 0) {
    return []
  }
  
  // جلب عدد المنتظرين لجميع العيادات
  const queueData = await getQueueLengths(clinicCodes)
  
  // تحويل الرموز إلى كائنات
  const clinics = mapClinicCodes(clinicCodes)
  
  // إعادة ترتيب العيادات حسب عدد المنتظرين
  const sortedClinics = sortClinicsByQueue(clinics, queueData)
  
  console.log('✅ Dynamic pathway generated:', sortedClinics.map(c => c.nameAr))
  
  return sortedClinics
}

export default getDynamicMedicalPathway


// المسارات الديناميكية حسب routeMap.json و clinics.json
import routeMap from '../../config/routeMap.json'
import clinicsData from '../../config/clinics.json'

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
      floorCode: clinic.floor
    }
  }).filter(Boolean)
}

// الحصول على المسار الطبي حسب نوع الفحص والجنس
export function getDynamicMedicalPathway(examType, gender) {
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
  
  // إذا كان المسار كائن (مثل نساء/عام)
  if (typeof route === 'object' && !Array.isArray(route)) {
    const genderKey = gender === 'female' ? 'F' : 'M'
    const codes = route[genderKey] || route.M || []
    return mapClinicCodes(codes)
  }
  
  // إذا كان المسار مصفوفة بسيطة
  if (Array.isArray(route)) {
    return mapClinicCodes(route)
  }
  
  return []
}

export default getDynamicMedicalPathway


// المسارات الديناميكية - تعمل sync ثم تعيد الترتيب في الخلفية
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
      floorCode: clinic.floor,
      code: code
    }
  }).filter(Boolean)
}

// جلب أوزان العيادات (عدد المنتظرين) من API
async function fetchClinicWeights(clinicIds) {
  const weights = {}
  
  try {
    const promises = clinicIds.map(async (clinicId) => {
      try {
        const response = await fetch(`/api/v1/queue/status?clinic=${clinicId}`)
        const data = await response.json()
        
        if (data.success) {
          weights[clinicId] = data.total_waiting || data.waiting || 0
        } else {
          weights[clinicId] = 0
        }
      } catch (err) {
        weights[clinicId] = 0
      }
    })
    
    await Promise.all(promises)
  } catch (err) {
    console.error('Failed to fetch clinic weights:', err)
  }
  
  return weights
}

// ترتيب العيادات حسب الأوزان (الفارغة أولاً)
function sortClinicsByWeight(clinics, weights) {
  return [...clinics].sort((a, b) => {
    const weightA = weights[a.id] || 0
    const weightB = weights[b.id] || 0
    return weightA - weightB
  })
}

// الحصول على المسار الطبي حسب نوع الفحص والجنس
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
  
  // الحصول على رموز العيادات
  let codes = []
  if (typeof route === 'object' && !Array.isArray(route)) {
    const genderKey = gender === 'female' ? 'F' : 'M'
    codes = route[genderKey] || route.M || []
  } else if (Array.isArray(route)) {
    codes = route
  }
  
  if (codes.length === 0) {
    return []
  }
  
  // تحويل الرموز إلى كائنات عيادات
  const clinics = mapClinicCodes(codes)
  
  if (clinics.length === 0) {
    return []
  }
  
  // جلب أوزان العيادات وترتيبها
  const clinicIds = clinics.map(c => c.id)
  const weights = await fetchClinicWeights(clinicIds)
  const sortedClinics = sortClinicsByWeight(clinics, weights)
  
  return sortedClinics
}

export default getDynamicMedicalPathway


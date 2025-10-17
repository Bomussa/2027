import { clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs) {
  return twMerge(clsx(inputs))
}

export const examTypes = [
  {
    id: 'recruitment',
    name: 'Recruitment Exam',
    nameAr: 'فحص التجنيد',
    icon: '👤',
    color: 'from-blue-500 to-blue-600'
  },
  {
    id: 'promotion',
    name: 'Promotion Exam',
    nameAr: 'فحص الترفيع',
    icon: '⬆️',
    color: 'from-green-500 to-green-600'
  },
  {
    id: 'transfer',
    name: 'Transfer Exam',
    nameAr: 'فحص النقل',
    icon: '🔄',
    color: 'from-purple-500 to-purple-600'
  },
  {
    id: 'referral',
    name: 'Referral Exam',
    nameAr: 'فحص التحويل',
    icon: '📋',
    color: 'from-orange-500 to-orange-600'
  },
  {
    id: 'contract',
    name: 'Contract Renewal',
    nameAr: 'تجديد التعاقد',
    icon: '📝',
    color: 'from-teal-500 to-teal-600'
  },
  {
    id: 'aviation',
    name: 'Aviation Annual Exam',
    nameAr: 'فحص الطيران السنوي',
    icon: '✈️',
    color: 'from-indigo-500 to-indigo-600'
  },
  {
    id: 'cooks',
    name: 'Cooks Exam',
    nameAr: 'فحص الطباخين',
    icon: '👨‍🍳',
    color: 'from-amber-500 to-amber-600'
  },
  {
    id: 'courses',
    name: 'Internal & External Courses',
    nameAr: 'فحص الدورات الداخلية والخارجية',
    icon: '📚',
    color: 'from-gray-500 to-gray-600'
  }
]

// Medical pathways based on exam type and gender
export const medicalPathways = {
  // فحص الدورات الداخلية والخارجية
  courses: {
    male: [
      { id: 'lab', name: 'Laboratory', nameAr: 'المختبر', floor: 'الميزانين', floorCode: 'M' },
      { id: 'vitals', name: 'Vital Signs', nameAr: 'القياسات الحيوية', floor: 'الطابق الثاني', floorCode: '2' },
      { id: 'ophthalmology', name: 'Ophthalmology', nameAr: 'عيادة العيون', floor: 'الطابق الثاني', floorCode: '2' },
      { id: 'internal', name: 'Internal Medicine', nameAr: 'عيادة الباطنية', floor: 'الطابق الثاني', floorCode: '2' },
      { id: 'surgery', name: 'General Surgery', nameAr: 'عيادة الجراحة العامة', floor: 'الطابق الثاني', floorCode: '2' },
      { id: 'orthopedics', name: 'Orthopedics', nameAr: 'عيادة العظام والمفاصل', floor: 'الطابق الثاني', floorCode: '2' },
      { id: 'ent', name: 'ENT', nameAr: 'عيادة أنف وأذن وحنجرة', floor: 'الطابق الثاني', floorCode: '2' }
    ],
    female: [
      { id: 'lab', name: 'Laboratory', nameAr: 'المختبر', floor: 'الميزانين', floorCode: 'M' },
      { id: 'vitals', name: 'Vital Signs', nameAr: 'القياسات الحيوية', floor: 'الطابق الثاني', floorCode: '2' },
      { id: 'ent', name: 'ENT', nameAr: 'عيادة أنف وأذن وحنجرة', floor: 'الطابق الثاني', floorCode: '2' },
      { id: 'surgery', name: 'General Surgery', nameAr: 'عيادة الجراحة العامة', floor: 'الطابق الثاني', floorCode: '2' },
      { id: 'orthopedics', name: 'Orthopedics', nameAr: 'عيادة العظام والمفاصل', floor: 'الطابق الثاني', floorCode: '2' },
      { id: 'psychology', name: 'Psychology', nameAr: 'عيادة النفسية', floor: 'الطابق الثاني', floorCode: '2' },
      { id: 'dental', name: 'Dental', nameAr: 'عيادة الأسنان', floor: 'الطابق الثاني', floorCode: '2' },
      { id: 'internal_f', name: 'Internal Medicine', nameAr: 'عيادة الباطنية', floor: 'الطابق الثالث', floorCode: '3', note: 'يجب التسجيل من استقبال العطار' },
      { id: 'ophthalmology_f', name: 'Ophthalmology', nameAr: 'عيادة العيون', floor: 'الطابق الثالث', floorCode: '3', note: 'يجب التسجيل من استقبال العطار' },
      { id: 'dermatology', name: 'Dermatology', nameAr: 'عيادة الجلدية', floor: 'الطابق الثالث', floorCode: '3', note: 'يجب التسجيل من استقبال العطار' }
    ]
  },
  
  // فحص التجنيد والترفيع والنقل والتحويل وتجديد التعاقد
  recruitment: {
    male: [
      { id: 'lab', name: 'Laboratory & Radiology', nameAr: 'المختبر والأشعة', floor: 'الميزانين', floorCode: 'M' },
      { id: 'vitals', name: 'Vital Signs', nameAr: 'القياسات الحيوية', floor: 'الطابق الثاني', floorCode: '2' },
      { id: 'ophthalmology', name: 'Ophthalmology', nameAr: 'عيادة العيون', floor: 'الطابق الثاني', floorCode: '2' },
      { id: 'internal', name: 'Internal Medicine', nameAr: 'عيادة الباطنية', floor: 'الطابق الثاني', floorCode: '2' },
      { id: 'surgery', name: 'General Surgery', nameAr: 'عيادة الجراحة العامة', floor: 'الطابق الثاني', floorCode: '2' },
      { id: 'orthopedics', name: 'Orthopedics', nameAr: 'عيادة العظام والمفاصل', floor: 'الطابق الثاني', floorCode: '2' },
      { id: 'ent', name: 'ENT', nameAr: 'عيادة أنف وأذن وحنجرة', floor: 'الطابق الثاني', floorCode: '2' },
      { id: 'psychology', name: 'Psychology', nameAr: 'عيادة النفسية', floor: 'الطابق الثاني', floorCode: '2' },
      { id: 'dental', name: 'Dental', nameAr: 'عيادة الأسنان', floor: 'الطابق الثاني', floorCode: '2' }
    ],
    female: [
      { id: 'lab', name: 'Laboratory', nameAr: 'المختبر', floor: 'الميزانين', floorCode: 'M' },
      { id: 'vitals', name: 'Vital Signs', nameAr: 'القياسات الحيوية', floor: 'الطابق الثاني', floorCode: '2' },
      { id: 'ent', name: 'ENT', nameAr: 'عيادة أنف وأذن وحنجرة', floor: 'الطابق الثاني', floorCode: '2' },
      { id: 'surgery', name: 'General Surgery', nameAr: 'عيادة الجراحة العامة', floor: 'الطابق الثاني', floorCode: '2' },
      { id: 'orthopedics', name: 'Orthopedics', nameAr: 'عيادة العظام والمفاصل', floor: 'الطابق الثاني', floorCode: '2' },
      { id: 'psychology', name: 'Psychology', nameAr: 'عيادة النفسية', floor: 'الطابق الثاني', floorCode: '2' },
      { id: 'dental', name: 'Dental', nameAr: 'عيادة الأسنان', floor: 'الطابق الثاني', floorCode: '2' },
      { id: 'internal_f', name: 'Internal Medicine', nameAr: 'عيادة الباطنية', floor: 'الطابق الثالث', floorCode: '3', note: 'يجب التسجيل من استقبال العطار' },
      { id: 'ophthalmology_f', name: 'Ophthalmology', nameAr: 'عيادة العيون', floor: 'الطابق الثالث', floorCode: '3', note: 'يجب التسجيل من استقبال العطار' },
      { id: 'dermatology', name: 'Dermatology', nameAr: 'عيادة الجلدية', floor: 'الطابق الثالث', floorCode: '3', note: 'يجب التسجيل من استقبال العطار' }
    ]
  },
  
  // نفس المسار للترفيع والنقل والتحويل وتجديد التعاقد
  promotion: {
    male: [
      { id: 'lab', name: 'Laboratory & Radiology', nameAr: 'المختبر والأشعة', floor: 'الميزانين', floorCode: 'M' },
      { id: 'vitals', name: 'Vital Signs', nameAr: 'القياسات الحيوية', floor: 'الطابق الثاني', floorCode: '2' },
      { id: 'ophthalmology', name: 'Ophthalmology', nameAr: 'عيادة العيون', floor: 'الطابق الثاني', floorCode: '2' },
      { id: 'internal', name: 'Internal Medicine', nameAr: 'عيادة الباطنية', floor: 'الطابق الثاني', floorCode: '2' },
      { id: 'surgery', name: 'General Surgery', nameAr: 'عيادة الجراحة العامة', floor: 'الطابق الثاني', floorCode: '2' },
      { id: 'orthopedics', name: 'Orthopedics', nameAr: 'عيادة العظام والمفاصل', floor: 'الطابق الثاني', floorCode: '2' },
      { id: 'ent', name: 'ENT', nameAr: 'عيادة أنف وأذن وحنجرة', floor: 'الطابق الثاني', floorCode: '2' },
      { id: 'psychology', name: 'Psychology', nameAr: 'عيادة النفسية', floor: 'الطابق الثاني', floorCode: '2' },
      { id: 'dental', name: 'Dental', nameAr: 'عيادة الأسنان', floor: 'الطابق الثاني', floorCode: '2' }
    ],
    female: [
      { id: 'lab', name: 'Laboratory', nameAr: 'المختبر', floor: 'الميزانين', floorCode: 'M' },
      { id: 'vitals', name: 'Vital Signs', nameAr: 'القياسات الحيوية', floor: 'الطابق الثاني', floorCode: '2' },
      { id: 'ent', name: 'ENT', nameAr: 'عيادة أنف وأذن وحنجرة', floor: 'الطابق الثاني', floorCode: '2' },
      { id: 'surgery', name: 'General Surgery', nameAr: 'عيادة الجراحة العامة', floor: 'الطابق الثاني', floorCode: '2' },
      { id: 'orthopedics', name: 'Orthopedics', nameAr: 'عيادة العظام والمفاصل', floor: 'الطابق الثاني', floorCode: '2' },
      { id: 'psychology', name: 'Psychology', nameAr: 'عيادة النفسية', floor: 'الطابق الثاني', floorCode: '2' },
      { id: 'dental', name: 'Dental', nameAr: 'عيادة الأسنان', floor: 'الطابق الثاني', floorCode: '2' },
      { id: 'internal_f', name: 'Internal Medicine', nameAr: 'عيادة الباطنية', floor: 'الطابق الثالث', floorCode: '3', note: 'يجب التسجيل من استقبال العطار' },
      { id: 'ophthalmology_f', name: 'Ophthalmology', nameAr: 'عيادة العيون', floor: 'الطابق الثالث', floorCode: '3', note: 'يجب التسجيل من استقبال العطار' },
      { id: 'dermatology', name: 'Dermatology', nameAr: 'عيادة الجلدية', floor: 'الطابق الثالث', floorCode: '3', note: 'يجب التسجيل من استقبال العطار' }
    ]
  },
  
  transfer: {
    male: [
      { id: 'lab', name: 'Laboratory & Radiology', nameAr: 'المختبر والأشعة', floor: 'الميزانين', floorCode: 'M' },
      { id: 'vitals', name: 'Vital Signs', nameAr: 'القياسات الحيوية', floor: 'الطابق الثاني', floorCode: '2' },
      { id: 'ophthalmology', name: 'Ophthalmology', nameAr: 'عيادة العيون', floor: 'الطابق الثاني', floorCode: '2' },
      { id: 'internal', name: 'Internal Medicine', nameAr: 'عيادة الباطنية', floor: 'الطابق الثاني', floorCode: '2' },
      { id: 'surgery', name: 'General Surgery', nameAr: 'عيادة الجراحة العامة', floor: 'الطابق الثاني', floorCode: '2' },
      { id: 'orthopedics', name: 'Orthopedics', nameAr: 'عيادة العظام والمفاصل', floor: 'الطابق الثاني', floorCode: '2' },
      { id: 'ent', name: 'ENT', nameAr: 'عيادة أنف وأذن وحنجرة', floor: 'الطابق الثاني', floorCode: '2' },
      { id: 'psychology', name: 'Psychology', nameAr: 'عيادة النفسية', floor: 'الطابق الثاني', floorCode: '2' },
      { id: 'dental', name: 'Dental', nameAr: 'عيادة الأسنان', floor: 'الطابق الثاني', floorCode: '2' }
    ],
    female: [
      { id: 'lab', name: 'Laboratory', nameAr: 'المختبر', floor: 'الميزانين', floorCode: 'M' },
      { id: 'vitals', name: 'Vital Signs', nameAr: 'القياسات الحيوية', floor: 'الطابق الثاني', floorCode: '2' },
      { id: 'ent', name: 'ENT', nameAr: 'عيادة أنف وأذن وحنجرة', floor: 'الطابق الثاني', floorCode: '2' },
      { id: 'surgery', name: 'General Surgery', nameAr: 'عيادة الجراحة العامة', floor: 'الطابق الثاني', floorCode: '2' },
      { id: 'orthopedics', name: 'Orthopedics', nameAr: 'عيادة العظام والمفاصل', floor: 'الطابق الثاني', floorCode: '2' },
      { id: 'psychology', name: 'Psychology', nameAr: 'عيادة النفسية', floor: 'الطابق الثاني', floorCode: '2' },
      { id: 'dental', name: 'Dental', nameAr: 'عيادة الأسنان', floor: 'الطابق الثاني', floorCode: '2' },
      { id: 'internal_f', name: 'Internal Medicine', nameAr: 'عيادة الباطنية', floor: 'الطابق الثالث', floorCode: '3', note: 'يجب التسجيل من استقبال العطار' },
      { id: 'ophthalmology_f', name: 'Ophthalmology', nameAr: 'عيادة العيون', floor: 'الطابق الثالث', floorCode: '3', note: 'يجب التسجيل من استقبال العطار' },
      { id: 'dermatology', name: 'Dermatology', nameAr: 'عيادة الجلدية', floor: 'الطابق الثالث', floorCode: '3', note: 'يجب التسجيل من استقبال العطار' }
    ]
  },
  
  referral: {
    male: [
      { id: 'lab', name: 'Laboratory & Radiology', nameAr: 'المختبر والأشعة', floor: 'الميزانين', floorCode: 'M' },
      { id: 'vitals', name: 'Vital Signs', nameAr: 'القياسات الحيوية', floor: 'الطابق الثاني', floorCode: '2' },
      { id: 'ophthalmology', name: 'Ophthalmology', nameAr: 'عيادة العيون', floor: 'الطابق الثاني', floorCode: '2' },
      { id: 'internal', name: 'Internal Medicine', nameAr: 'عيادة الباطنية', floor: 'الطابق الثاني', floorCode: '2' },
      { id: 'surgery', name: 'General Surgery', nameAr: 'عيادة الجراحة العامة', floor: 'الطابق الثاني', floorCode: '2' },
      { id: 'orthopedics', name: 'Orthopedics', nameAr: 'عيادة العظام والمفاصل', floor: 'الطابق الثاني', floorCode: '2' },
      { id: 'ent', name: 'ENT', nameAr: 'عيادة أنف وأذن وحنجرة', floor: 'الطابق الثاني', floorCode: '2' },
      { id: 'psychology', name: 'Psychology', nameAr: 'عيادة النفسية', floor: 'الطابق الثاني', floorCode: '2' },
      { id: 'dental', name: 'Dental', nameAr: 'عيادة الأسنان', floor: 'الطابق الثاني', floorCode: '2' }
    ],
    female: [
      { id: 'lab', name: 'Laboratory', nameAr: 'المختبر', floor: 'الميزانين', floorCode: 'M' },
      { id: 'vitals', name: 'Vital Signs', nameAr: 'القياسات الحيوية', floor: 'الطابق الثاني', floorCode: '2' },
      { id: 'ent', name: 'ENT', nameAr: 'عيادة أنف وأذن وحنجرة', floor: 'الطابق الثاني', floorCode: '2' },
      { id: 'surgery', name: 'General Surgery', nameAr: 'عيادة الجراحة العامة', floor: 'الطابق الثاني', floorCode: '2' },
      { id: 'orthopedics', name: 'Orthopedics', nameAr: 'عيادة العظام والمفاصل', floor: 'الطابق الثاني', floorCode: '2' },
      { id: 'psychology', name: 'Psychology', nameAr: 'عيادة النفسية', floor: 'الطابق الثاني', floorCode: '2' },
      { id: 'dental', name: 'Dental', nameAr: 'عيادة الأسنان', floor: 'الطابق الثاني', floorCode: '2' },
      { id: 'internal_f', name: 'Internal Medicine', nameAr: 'عيادة الباطنية', floor: 'الطابق الثالث', floorCode: '3', note: 'يجب التسجيل من استقبال العطار' },
      { id: 'ophthalmology_f', name: 'Ophthalmology', nameAr: 'عيادة العيون', floor: 'الطابق الثالث', floorCode: '3', note: 'يجب التسجيل من استقبال العطار' },
      { id: 'dermatology', name: 'Dermatology', nameAr: 'عيادة الجلدية', floor: 'الطابق الثالث', floorCode: '3', note: 'يجب التسجيل من استقبال العطار' }
    ]
  },
  
  contract: {
    male: [
      { id: 'lab', name: 'Laboratory & Radiology', nameAr: 'المختبر والأشعة', floor: 'الميزانين', floorCode: 'M' },
      { id: 'vitals', name: 'Vital Signs', nameAr: 'القياسات الحيوية', floor: 'الطابق الثاني', floorCode: '2' },
      { id: 'ophthalmology', name: 'Ophthalmology', nameAr: 'عيادة العيون', floor: 'الطابق الثاني', floorCode: '2' },
      { id: 'internal', name: 'Internal Medicine', nameAr: 'عيادة الباطنية', floor: 'الطابق الثاني', floorCode: '2' },
      { id: 'surgery', name: 'General Surgery', nameAr: 'عيادة الجراحة العامة', floor: 'الطابق الثاني', floorCode: '2' },
      { id: 'orthopedics', name: 'Orthopedics', nameAr: 'عيادة العظام والمفاصل', floor: 'الطابق الثاني', floorCode: '2' },
      { id: 'ent', name: 'ENT', nameAr: 'عيادة أنف وأذن وحنجرة', floor: 'الطابق الثاني', floorCode: '2' },
      { id: 'psychology', name: 'Psychology', nameAr: 'عيادة النفسية', floor: 'الطابق الثاني', floorCode: '2' },
      { id: 'dental', name: 'Dental', nameAr: 'عيادة الأسنان', floor: 'الطابق الثاني', floorCode: '2' }
    ],
    female: [
      { id: 'lab', name: 'Laboratory', nameAr: 'المختبر', floor: 'الميزانين', floorCode: 'M' },
      { id: 'vitals', name: 'Vital Signs', nameAr: 'القياسات الحيوية', floor: 'الطابق الثاني', floorCode: '2' },
      { id: 'ent', name: 'ENT', nameAr: 'عيادة أنف وأذن وحنجرة', floor: 'الطابق الثاني', floorCode: '2' },
      { id: 'surgery', name: 'General Surgery', nameAr: 'عيادة الجراحة العامة', floor: 'الطابق الثاني', floorCode: '2' },
      { id: 'orthopedics', name: 'Orthopedics', nameAr: 'عيادة العظام والمفاصل', floor: 'الطابق الثاني', floorCode: '2' },
      { id: 'psychology', name: 'Psychology', nameAr: 'عيادة النفسية', floor: 'الطابق الثاني', floorCode: '2' },
      { id: 'dental', name: 'Dental', nameAr: 'عيادة الأسنان', floor: 'الطابق الثاني', floorCode: '2' },
      { id: 'internal_f', name: 'Internal Medicine', nameAr: 'عيادة الباطنية', floor: 'الطابق الثالث', floorCode: '3', note: 'يجب التسجيل من استقبال العطار' },
      { id: 'ophthalmology_f', name: 'Ophthalmology', nameAr: 'عيادة العيون', floor: 'الطابق الثالث', floorCode: '3', note: 'يجب التسجيل من استقبال العطار' },
      { id: 'dermatology', name: 'Dermatology', nameAr: 'عيادة الجلدية', floor: 'الطابق الثالث', floorCode: '3', note: 'يجب التسجيل من استقبال العطار' }
    ]
  },
  
  // فحص الطيران السنوي
  aviation: {
    male: [
      { id: 'lab', name: 'Laboratory', nameAr: 'المختبر', floor: 'الميزانين', floorCode: 'M' },
      { id: 'ophthalmology', name: 'Ophthalmology', nameAr: 'عيادة العيون', floor: 'الطابق الثاني', floorCode: '2' },
      { id: 'internal', name: 'Internal Medicine', nameAr: 'عيادة الباطنية', floor: 'الطابق الثاني', floorCode: '2' },
      { id: 'ent', name: 'ENT', nameAr: 'عيادة أنف وأذن وحنجرة', floor: 'الطابق الثاني', floorCode: '2' },
      { id: 'ecg', name: 'ECG', nameAr: 'عيادة تخطيط القلب', floor: 'الطابق الثاني', floorCode: '2' },
      { id: 'audiology', name: 'Audiology', nameAr: 'عيادة السمع', floor: 'الطابق الثاني', floorCode: '2' }
    ],
    female: [
      { id: 'lab', name: 'Laboratory', nameAr: 'المختبر', floor: 'الميزانين', floorCode: 'M' },
      { id: 'ent', name: 'ENT', nameAr: 'عيادة أنف وأذن وحنجرة', floor: 'الطابق الثاني', floorCode: '2' },
      { id: 'surgery', name: 'General Surgery', nameAr: 'عيادة الجراحة العامة', floor: 'الطابق الثاني', floorCode: '2' },
      { id: 'orthopedics', name: 'Orthopedics', nameAr: 'عيادة العظام والمفاصل', floor: 'الطابق الثاني', floorCode: '2' },
      { id: 'psychology', name: 'Psychology', nameAr: 'عيادة النفسية', floor: 'الطابق الثاني', floorCode: '2' },
      { id: 'dental', name: 'Dental', nameAr: 'عيادة الأسنان', floor: 'الطابق الثاني', floorCode: '2' },
      { id: 'internal_f', name: 'Internal Medicine', nameAr: 'عيادة الباطنية', floor: 'الطابق الثالث', floorCode: '3', note: 'يجب التسجيل من استقبال العطار' },
      { id: 'ophthalmology_f', name: 'Ophthalmology', nameAr: 'عيادة العيون', floor: 'الطابق الثالث', floorCode: '3', note: 'يجب التسجيل من استقبال العطار' },
      { id: 'dermatology', name: 'Dermatology', nameAr: 'عيادة الجلدية', floor: 'الطابق الثالث', floorCode: '3', note: 'يجب التسجيل من استقبال العطار' }
    ]
  },
  
  // فحص الطباخين
  cooks: {
    male: [
      { id: 'lab', name: 'Laboratory', nameAr: 'المختبر', floor: 'الميزانين', floorCode: 'M' },
      { id: 'internal', name: 'Internal Medicine', nameAr: 'عيادة الباطنية', floor: 'الطابق الثاني', floorCode: '2' },
      { id: 'ent', name: 'ENT', nameAr: 'عيادة أنف وأذن وحنجرة', floor: 'الطابق الثاني', floorCode: '2' },
      { id: 'surgery', name: 'General Surgery', nameAr: 'عيادة الجراحة العامة', floor: 'الطابق الثاني', floorCode: '2' }
    ],
    female: [
      { id: 'lab', name: 'Laboratory', nameAr: 'المختبر', floor: 'الميزانين', floorCode: 'M' },
      { id: 'vitals', name: 'Vital Signs', nameAr: 'القياسات الحيوية', floor: 'الطابق الثاني', floorCode: '2' },
      { id: 'ent', name: 'ENT', nameAr: 'عيادة أنف وأذن وحنجرة', floor: 'الطابق الثاني', floorCode: '2' },
      { id: 'surgery', name: 'General Surgery', nameAr: 'عيادة الجراحة العامة', floor: 'الطابق الثاني', floorCode: '2' },
      { id: 'orthopedics', name: 'Orthopedics', nameAr: 'عيادة العظام والمفاصل', floor: 'الطابق الثاني', floorCode: '2' },
      { id: 'psychology', name: 'Psychology', nameAr: 'عيادة النفسية', floor: 'الطابق الثاني', floorCode: '2' },
      { id: 'dental', name: 'Dental', nameAr: 'عيادة الأسنان', floor: 'الطابق الثاني', floorCode: '2' },
      { id: 'internal_f', name: 'Internal Medicine', nameAr: 'عيادة الباطنية', floor: 'الطابق الثالث', floorCode: '3', note: 'يجب التسجيل من استقبال العطار' },
      { id: 'ophthalmology_f', name: 'Ophthalmology', nameAr: 'عيادة العيون', floor: 'الطابق الثالث', floorCode: '3', note: 'يجب التسجيل من استقبال العطار' },
      { id: 'dermatology', name: 'Dermatology', nameAr: 'عيادة الجلدية', floor: 'الطابق الثالث', floorCode: '3', note: 'يجب التسجيل من استقبال العطار' }
    ]
  }
}

// Get medical pathway based on exam type and gender
// Dynamic routing: Randomize clinic order for each patient
export function getMedicalPathway(examType, gender) {
  const pathway = medicalPathways[examType]
  if (!pathway) return []
  const basePath = pathway[gender] || pathway.male
  
  // Create a copy and shuffle the order (except first clinic - always lab)
  const result = [...basePath]
  
  // Keep first clinic (lab) fixed, shuffle the rest
  if (result.length > 1) {
    const firstClinic = result[0]
    const restClinics = result.slice(1)
    
    // Fisher-Yates shuffle algorithm
    for (let i = restClinics.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [restClinics[i], restClinics[j]] = [restClinics[j], restClinics[i]]
    }
    
    return [firstClinic, ...restClinics]
  }
  
  return result
}

export const themes = [
  { id: 'classic', name: 'Classic', nameAr: 'كلاسيكي', colors: ['#ef4444', '#fbbf24'] },
  { id: 'mint', name: 'Mint Medical', nameAr: 'طبي نعناعي', colors: ['#10b981', '#fbbf24'] },
  { id: 'navy', name: 'Military Navy', nameAr: 'بحري عسكري', colors: ['#3b82f6', '#fbbf24'] },
  { id: 'desert', name: 'Desert Gold', nameAr: 'ذهبي صحراوي', colors: ['#fbbf24', '#ef4444'] },
  { id: 'rose', name: 'Medical Rose', nameAr: 'وردي طبي', colors: ['#ef4444', '#fbbf24'] },
  { id: 'night', name: 'Night Shift', nameAr: 'المناوبة الليلية', colors: ['#fbbf24', '#ef4444'] }
]

export function formatTime(date) {
  return new Intl.DateTimeFormat('ar-SA', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  }).format(date)
}

export function formatDate(date) {
  return new Intl.DateTimeFormat('ar-SA', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(date)
}

export function calculateWaitTime(position, avgTime = 5) {
  return Math.max(0, (position - 1) * avgTime)
}

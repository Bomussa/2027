import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from './Card'
import { Button } from './Button'
import { 
  MapPin, 
  Stethoscope, 
  Eye, 
  Heart, 
  Brain, 
  Bone, 
  Ear, 
  TestTube, 
  Activity,
  Users,
  Clock,
  Settings,
  Plus,
  Edit,
  Trash2,
  Save,
  X
} from 'lucide-react'

// تكوين العيادات والمسارات بناءً على نماذج الفحص الطبي
const EXAM_ROUTES = {
  'دورات_داخلية_خارجية': {
    name: 'فحص الدورات الداخلية والخارجية',
    floors: {
      'mezzanine': {
        name: 'الطابق الميزانين',
        note: 'يمكن التوجه إلى طابق الميزانين عن طريق المصعد بالضغط على حرف M',
        clinics: ['المختبر']
      },
      'second': {
        name: 'الطابق الثاني (عيادات اللجنة الطبية العسكرية)',
        clinics: [
          'القياسات الحيوية',
          'عيادة العيون',
          'عيادة الباطنية',
          'عيادة الجراحة العامة',
          'عيادة العظام والمفاصل',
          'عيادة أنف وأذن وحنجرة'
        ]
      }
    }
  },
  'تجنيد_ترفيع_نقل_تحويل_تجديد': {
    name: 'فحص التجنيد والترفيع والنقل والتحويل وتجديد التعاقد',
    floors: {
      'mezzanine': {
        name: 'الطابق الميزانين',
        note: 'يمكن التوجه إلى طابق الميزانين عن طريق المصعد بالضغط على حرف M',
        clinics: ['المختبر والأشعة']
      },
      'second': {
        name: 'الطابق الثاني (عيادات اللجنة الطبية العسكرية)',
        clinics: [
          'القياسات الحيوية',
          'عيادة العيون',
          'عيادة الباطنية',
          'عيادة الجراحة العامة',
          'عيادة العظام والمفاصل',
          'عيادة أنف وأذن وحنجرة',
          'عيادة النفسية',
          'عيادة الأسنان'
        ]
      }
    }
  },
  'طيران_سنوي': {
    name: 'فحص الطيران السنوي',
    floors: {
      'mezzanine': {
        name: 'الطابق الميزانين',
        note: 'يمكن التوجه إلى طابق الميزانين عن طريق المصعد بالضغط على حرف M',
        clinics: ['المختبر']
      },
      'second': {
        name: 'الطابق الثاني (عيادات اللجنة الطبية العسكرية)',
        clinics: [
          'عيادة العيون',
          'عيادة الباطنية',
          'عيادة أنف وأذن وحنجرة',
          'عيادة تخطيط القلب',
          'عيادة السمع'
        ]
      }
    }
  },
  'طباخين': {
    name: 'فحص الطباخين',
    floors: {
      'mezzanine': {
        name: 'الطابق الميزانين',
        note: 'يمكن التوجه إلى طابق الميزانين عن طريق المصعد بالضغط على حرف M',
        clinics: ['المختبر']
      },
      'second': {
        name: 'الطابق الثاني (عيادات اللجنة الطبية العسكرية)',
        clinics: [
          'عيادة الباطنية',
          'عيادة أنف وأذن وحنجرة',
          'عيادة الجراحة العامة'
        ]
      }
    }
  },
  'عنصر_نسائي': {
    name: 'العنصر النسائي (جميع الفحوصات)',
    floors: {
      'mezzanine': {
        name: 'الطابق الميزانين',
        note: 'يمكن التوجه إلى طابق الميزانين عن طريق المصعد بالضغط على حرف M',
        clinics: ['المختبر']
      },
      'second': {
        name: 'الطابق الثاني (عيادات اللجنة الطبية العسكرية)',
        clinics: [
          'القياسات الحيوية',
          'عيادة أنف وأذن وحنجرة',
          'عيادة الجراحة العامة',
          'عيادة العظام والمفاصل',
          'عيادة النفسية',
          'عيادة الأسنان'
        ]
      },
      'third': {
        name: 'الطابق الثالث',
        note: 'يجب التسجيل من استقبال العطار',
        clinics: [
          'عيادة الباطنية',
          'عيادة العيون',
          'عيادة الجلدية'
        ]
      }
    }
  }
}

const CLINIC_ICONS = {
  'المختبر': TestTube,
  'المختبر والأشعة': TestTube,
  'القياسات الحيوية': Activity,
  'عيادة العيون': Eye,
  'عيادة الباطنية': Heart,
  'عيادة الجراحة العامة': Stethoscope,
  'عيادة العظام والمفاصل': Bone,
  'عيادة أنف وأذن وحنجرة': Ear,
  'عيادة النفسية': Brain,
  'عيادة الأسنان': Stethoscope,
  'عيادة تخطيط القلب': Heart,
  'عيادة السمع': Ear,
  'عيادة الجلدية': Stethoscope
}

export function ClinicsConfiguration({ language }) {
  const [selectedExam, setSelectedExam] = useState('دورات_داخلية_خارجية')
  const [clinicsData, setClinicsData] = useState({})

  const getClinicIcon = (clinicName) => {
    const IconComponent = CLINIC_ICONS[clinicName] || Stethoscope
    return <IconComponent className="h-4 w-4" />
  }

  const getFloorColor = (floorKey) => {
    switch (floorKey) {
      case 'mezzanine': return 'bg-blue-50 border-blue-200'
      case 'second': return 'bg-green-50 border-green-200'
      case 'third': return 'bg-purple-50 border-purple-200'
      default: return 'bg-gray-50 border-gray-200'
    }
  }

  const getFloorIcon = (floorKey) => {
    switch (floorKey) {
      case 'mezzanine': return 'M'
      case 'second': return '2'
      case 'third': return '3'
      default: return '?'
    }
  }

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">تكوين العيادات والمسارات</h1>
        <div className="text-sm text-gray-500">
          بناءً على نماذج الفحص الطبي المعتمدة
        </div>
      </div>

      {/* Exam Type Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            اختيار نوع الفحص
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {Object.entries(EXAM_ROUTES).map(([key, exam]) => (
              <Button
                key={key}
                variant={selectedExam === key ? "default" : "outline"}
                className="h-auto p-4 text-right justify-start"
                onClick={() => setSelectedExam(key)}
              >
                <div>
                  <div className="font-medium text-sm">{exam.name}</div>
                  <div className="text-xs text-gray-500 mt-1">
                    {Object.keys(exam.floors).length} طوابق
                  </div>
                </div>
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Selected Exam Route */}
      {selectedExam && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5" />
              مسار الفحص: {EXAM_ROUTES[selectedExam].name}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {Object.entries(EXAM_ROUTES[selectedExam].floors).map(([floorKey, floor]) => (
                <div key={floorKey} className={`p-4 rounded-lg border-2 ${getFloorColor(floorKey)}`}>
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center font-bold text-lg border-2">
                      {getFloorIcon(floorKey)}
                    </div>
                    <div>
                      <h3 className="font-semibold text-lg">{floor.name}</h3>
                      {floor.note && (
                        <p className="text-sm text-gray-600 mt-1">{floor.note}</p>
                      )}
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {floor.clinics.map((clinic, index) => (
                      <div key={index} className="flex items-center gap-3 p-3 bg-white rounded-lg border">
                        <div className="text-blue-600">
                          {getClinicIcon(clinic)}
                        </div>
                        <div>
                          <div className="font-medium text-sm">{clinic}</div>
                          <div className="text-xs text-gray-500">
                            الخطوة {index + 1}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Dynamic Clinic Assignment Note */}
      <Card className="bg-yellow-50 border-yellow-200">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <div className="text-yellow-600 mt-1">
              <Users className="h-5 w-5" />
            </div>
            <div>
              <h4 className="font-medium text-yellow-800 mb-2">نظام التوزيع الديناميكي</h4>
              <p className="text-sm text-yellow-700">
                يتم توزيع المراجعين على العيادات بشكل ديناميكي (نموذج A و B و C و D) 
                لضمان عدم تراكم المراجعين على عيادة معينة وتحسين تدفق المرضى.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

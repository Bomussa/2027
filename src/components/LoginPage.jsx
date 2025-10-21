import React, { useState } from 'react'
import { Card, CardContent } from './Card'
import { Button } from './Button'
import { Input } from './Input'
import { User, Globe } from 'lucide-react'
import { themes } from '../lib/utils'
import { t } from '../lib/i18n'

export function LoginPage({ onLogin, currentTheme, onThemeChange, language, toggleLanguage }) {
  const [patientId, setPatientId] = useState('')
  const [gender, setGender] = useState('male')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!patientId.trim()) return

    setLoading(true)
    try {
      await onLogin({ patientId: patientId.trim(), gender })
    } catch (error) {
      console.error('Login error:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-8">
        {/* Language Selector */}
        <div className="absolute top-4 right-4">
          <Button
            variant="ghost"
            size="sm"
            className="text-gray-300 hover:text-white hover:bg-gray-800/50"
            onClick={toggleLanguage}
          >
            <Globe className="w-4 h-4 mr-2" />
            {language === 'ar' ? 'English 🇺🇸' : 'العربية 🇶🇦'}
          </Button>
        </div>

        {/* Logo and Title */}
        <div className="text-center space-y-4">
          <img src="/logo.jpeg" alt="قيادة الخدمات الطبية" className="mx-auto w-32 h-32 rounded-full shadow-lg" />
          
          <div>
            <h1 className="text-3xl font-bold text-white">
              {language === 'ar' ? 'قيادة الخدمات الطبية' : 'Medical Services Command'}
            </h1>
            <p className="text-xl text-gray-300 mt-2">
              {language === 'ar' ? 'Medical Services' : 'قيادة الخدمات الطبية'}
            </p>
            <p className="text-gray-400 mt-2">
              {language === 'ar' 
                ? 'المركز الطبي المتخصص العسكري - العطار - اللجنة الطبية'
                : 'Military Specialized Medical Center – Al-Attar – Medical Committee'}
            </p>
            <p className="text-gray-500 text-sm">
              {language === 'ar'
                ? 'Military Specialized Medical Center – Al-Attar – Medical Committee'
                : 'المركز الطبي المتخصص العسكري - العطار - اللجنة الطبية'}
            </p>
          </div>
          
          <div className="flex justify-center gap-2 mt-4">
            {themes.map((theme) => (
              <button
                key={theme.id}
                onClick={() => onThemeChange(theme.id)}
                className={`px-3 py-1 rounded-full text-sm font-medium transition-all ${currentTheme === theme.id ? 'bg-primary text-primary-foreground shadow-md' : 'bg-muted text-muted-foreground hover:bg-muted/80'}`}
              >
                {language === 'ar' ? theme.nameAr : theme.name}
              </button>
            ))}
          </div>
        </div>

        {/* Login Form */}
        <Card className="bg-gray-800/50 border-gray-700 backdrop-blur-sm">
          <CardContent className="p-8">
            <div className="text-center mb-6">
              <User className="mx-auto w-12 h-12 text-gray-400 mb-4" />
              <h2 className="text-xl font-semibold text-white">{t('welcome', language)}</h2>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  {t('personalNumber', language)}
                </label>
                <Input
                  type="text"
                  placeholder={t('enterPersonalNumber', language)}
                  value={patientId}
                  onChange={(e) => setPatientId(e.target.value)}
                  className="bg-gray-700/50 border-gray-600 text-white placeholder-gray-400"
                  pattern="^[0-9]{2,10}$"
                  title={language === 'ar' ? 'الرقم العسكري يجب أن يتكون من 2 إلى 10 أرقام' : 'Military number must be 2-10 digits'}
                  minLength={2}
                  maxLength={10}
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-3">
                  {t('gender', language)}
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <Button
                    type="button"
                    variant={gender === 'male' ? 'gradient' : 'outline'}
                    className={`h-12 ${gender === 'male' ? '' : 'border-gray-600 text-gray-300 hover:bg-gray-700'}`}
                    onClick={() => setGender('male')}
                  >
                    👨 {t('male', language)}
                  </Button>
                  <Button
                    type="button"
                    variant={gender === 'female' ? 'gradient' : 'outline'}
                    className={`h-12 ${gender === 'female' ? '' : 'border-gray-600 text-gray-300 hover:bg-gray-700'}`}
                    onClick={() => setGender('female')}
                  >
                    👩 {t('female', language)}
                  </Button>
                </div>
              </div>

              <Button
                type="submit"
                variant="gradient"
                className="w-full h-12 text-lg font-semibold"
                disabled={loading || !patientId.trim()}
              >
                {loading 
                  ? (language === 'ar' ? 'جاري المعالجة...' : 'Processing...') 
                  : (language === 'ar' ? 'تأكيد ←' : 'Confirm →')}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

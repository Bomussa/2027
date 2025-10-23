/**
 * src/lib/api-middleware.js
 * طبقة تكيف (Adapter Layer) بين API القديم والطبقة الوسطية الجديدة
 * 
 * هذه الطبقة تحول استدعاءات API القديمة إلى استدعاءات الطبقة الوسطية
 * مع الحفاظ على التوافق الكامل مع الواجهة الحالية
 */

import { MW } from '../api/facade.ts';

/**
 * ApiMiddlewareAdapter
 * يوفر نفس واجهة ApiService الأصلية ولكن يستخدم الطبقة الوسطية
 */
class ApiMiddlewareAdapter {
  constructor() {
    console.log('🔄 Middleware Adapter initialized');
  }

  /**
   * تسجيل دخول المريض
   * يحول الطلب القديم إلى startSession في الطبقة الوسطية
   */
  async patientLogin(patientId, gender) {
    try {
      const result = await MW.startSession({
        deviceId: patientId,
        ip: 'local',
        qrToken: `${patientId}_${gender}_${Date.now()}`
      });
      
      return {
        success: true,
        data: {
          sessionId: result.sessionId,
          patientId,
          gender
        }
      };
    } catch (error) {
      console.error('Middleware patientLogin error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * دخول الدور في عيادة
   * يستخدم clinicEnter ثم issueQueue من الطبقة الوسطية
   */
  async enterQueue(clinic, user, isAutoEntry = false) {
    try {
      // أولاً: تسجيل الدخول للعيادة
      await MW.clinicEnter({
        sessionId: user.sessionId || user.patientId,
        clinicId: clinic
      });

      // ثانياً: إصدار رقم الدور
      const queueResult = await MW.issueQueue({
        sessionId: user.sessionId || user.patientId,
        clinicId: clinic
      });

      return {
        success: true,
        number: queueResult.number,
        display_number: queueResult.number,
        ahead: 0,
        total_waiting: 1,
        clinic,
        user
      };
    } catch (error) {
      console.error('Middleware enterQueue error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * الحصول على موقع الدور الحالي
   * في الطبقة الوسطية، هذا يتم عبر الاشتراك في البث المباشر
   * لكن للتوافق، نرجع بيانات ثابتة مؤقتاً
   */
  async getQueuePosition(clinic, user) {
    try {
      // TODO: تنفيذ الاستعلام الفعلي من الطبقة الوسطية
      return {
        success: true,
        display_number: 1,
        ahead: 0,
        total_waiting: 1,
        estimated_wait_minutes: 0
      };
    } catch (error) {
      console.error('Middleware getQueuePosition error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * حالة الدور في عيادة
   */
  async getQueueStatus(clinic) {
    try {
      // TODO: تنفيذ الاستعلام الفعلي من الطبقة الوسطية
      return {
        success: true,
        clinic,
        list: [],
        current_serving: null,
        total_waiting: 0
      };
    } catch (error) {
      console.error('Middleware getQueueStatus error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * إنهاء الدور والخروج من العيادة
   */
  async queueDone(clinic, user, pin) {
    try {
      const result = await MW.verifyPIN({
        sessionId: user.sessionId || user.patientId,
        clinicId: clinic,
        pin: String(pin)
      });

      return {
        success: result.valid,
        message: result.valid ? 'تم التحقق من الرمز بنجاح' : 'رمز غير صحيح',
        nextClinicId: result.nextClinicId,
        queueNumber: result.queueNumber
      };
    } catch (error) {
      console.error('Middleware queueDone error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * الخروج من العيادة بـ PIN
   */
  async clinicExit(patientId, clinicId, pin) {
    try {
      const result = await MW.verifyPIN({
        sessionId: patientId,
        clinicId,
        pin: String(pin)
      });

      return {
        success: result.valid,
        message: result.valid ? 'تم الخروج بنجاح' : 'رمز غير صحيح',
        route: result.nextClinicId ? { next: result.nextClinicId } : null
      };
    } catch (error) {
      console.error('Middleware clinicExit error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * حالة PIN اليومي
   */
  async getPinStatus() {
    try {
      const result = await MW.adminPins();
      return {
        success: true,
        pins: result.pins || {}
      };
    } catch (error) {
      console.error('Middleware getPinStatus error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * الحصول على جميع أكواد PIN النشطة
   */
  async getActivePins(adminCode) {
    try {
      const result = await MW.adminPins();
      return {
        success: true,
        pins: result.pins || []
      };
    } catch (error) {
      console.error('Middleware getActivePins error:', error);
      return {
        success: false,
        pins: []
      };
    }
  }

  /**
   * استدعاء المراجع التالي (للإدارة)
   */
  async callNextPatient(clinic) {
    try {
      // TODO: تنفيذ عبر الطبقة الوسطية
      return {
        success: true,
        next_patient: null
      };
    } catch (error) {
      console.error('Middleware callNextPatient error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // دعم Offline Queue (نفس الآلية من API الأصلي)
  async syncOfflineQueue() {
    console.log('Middleware: Offline queue sync not implemented yet');
  }
}

export default ApiMiddlewareAdapter;


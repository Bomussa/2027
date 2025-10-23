/**
 * src/api/facade.ts
 * واجهة موحّدة للتواصل مع الطبقة الوسطية (Middleware V2)
 * 
 * هذه الواجهة توفر نقطة دخول واحدة لجميع العمليات التي تمر عبر الطبقة الوسطية
 * مما يسهل الصيانة ويضمن الاتساق في التعامل مع الطلبات
 */

const MW_BASE = import.meta.env.VITE_MW_BASE_URL || '/mw';

/**
 * معالج الأخطاء الموحد
 */
async function handleResponse(response: Response) {
  const text = await response.text();
  let data;
  
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = { raw: text };
  }

  if (!response.ok) {
    throw new Error(data?.error || `HTTP ${response.status}`);
  }

  return data;
}

/**
 * واجهة الطبقة الوسطية
 */
export const MW = {
  /**
   * بدء جلسة جديدة
   * @param payload - {deviceId, ip, qrToken}
   * @returns {sessionId}
   */
  startSession: async (payload: any) => {
    const response = await fetch(`${MW_BASE}/session/start`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    return handleResponse(response);
  },

  /**
   * دخول عيادة
   * @param payload - {sessionId, clinicId}
   * @returns {ok: true}
   */
  clinicEnter: async (payload: any) => {
    const response = await fetch(`${MW_BASE}/clinic/enter`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    return handleResponse(response);
  },

  /**
   * التحقق من PIN والخروج من العيادة
   * @param payload - {sessionId, clinicId, pin}
   * @returns {valid: true, nextClinicId, queueNumber}
   */
  verifyPIN: async (payload: any) => {
    const response = await fetch(`${MW_BASE}/pin/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    return handleResponse(response);
  },

  /**
   * إصدار رقم دور
   * @param payload - {sessionId, clinicId}
   * @returns {number}
   */
  issueQueue: async (payload: any) => {
    const response = await fetch(`${MW_BASE}/queue/issue`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    return handleResponse(response);
  },

  /**
   * الحصول على أكواد PIN اليومية (للإدارة)
   * @returns {pins: [{clinicId, codes: []}]}
   */
  adminPins: async () => {
    const response = await fetch(`${MW_BASE}/admin/pins/today`);
    return handleResponse(response);
  },

  /**
   * الاتصال بالبث المباشر للإدارة (SSE)
   * @returns EventSource
   */
  adminLive: () => {
    return new EventSource(`${MW_BASE}/admin/live`);
  }
};

export default MW;


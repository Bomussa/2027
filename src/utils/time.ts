import CONST from "../../config/constants.json" with { type: "json" };
export const tz = CONST.TIMEZONE as string;
const pivot = CONST.SERVICE_DAY_PIVOT as string;

export function nowISO() {
  return new Date().toISOString();
}

export function localDateKeyAsiaQatar(d = new Date()) {
  // Convert to Asia/Qatar timezone (UTC+3)
  const qatarOffset = 3 * 60; // Qatar is UTC+3
  const localTime = new Date(d.getTime() + qatarOffset * 60 * 1000);
  
  const [h, m] = pivot.split(':').map(Number);
  const pivotMs = (h * 60 + m) * 60 * 1000;
  const localDayMs = ((localTime.getUTCHours() * 60 + localTime.getUTCMinutes()) * 60 + localTime.getUTCSeconds()) * 1000;
  
  // Before pivot time → attribute to previous day
  let targetDate = new Date(localTime);
  if (localDayMs < pivotMs) {
    targetDate.setUTCDate(targetDate.getUTCDate() - 1);
  }
  
  const year = targetDate.getUTCFullYear();
  const month = String(targetDate.getUTCMonth() + 1).padStart(2, '0');
  const day = String(targetDate.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

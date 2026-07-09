export const MONTH_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const MONTH_MAP = {
  JAN: 0, FEB: 1, MAR: 2, APR: 3, MAY: 4, JUN: 5,
  JUL: 6, AUG: 7, SEP: 8, OCT: 9, NOV: 10, DEC: 11,
};

export function parseEventDate(ev) {
  if (window.AdobeUserFeatures?.parseEventDate) {
    return window.AdobeUserFeatures.parseEventDate(ev);
  }
  const m = MONTH_MAP[String(ev?.month || '').toUpperCase()];
  const d = parseInt(ev?.day, 10);
  if (m == null || Number.isNaN(d)) return null;
  return new Date(new Date().getFullYear(), m, d);
}

export function isUpcoming(ev) {
  if (window.AdobeUserFeatures?.isEventUpcoming) {
    return window.AdobeUserFeatures.isEventUpcoming(ev);
  }
  const dt = parseEventDate(ev);
  if (!dt) return true;
  const endOfDay = new Date(dt.getFullYear(), dt.getMonth(), dt.getDate(), 23, 59, 59);
  return Date.now() <= endOfDay.getTime();
}

export function sortByEventDate(events) {
  return [...events].sort((a, b) => {
    const da = parseEventDate(a);
    const db = parseEventDate(b);
    if (!da && !db) return 0;
    if (!da) return 1;
    if (!db) return -1;
    return da - db;
  });
}

// Money + Thai/Buddhist-Era date formatting.

const THAI_MONTH_ABBR = [
  'ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.',
  'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.',
];

const THAI_MONTH_FULL = [
  'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
  'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม',
];

const BANGKOK_TZ = 'Asia/Bangkok';

/** "today" as a Date representing the current wall-clock date in Asia/Bangkok, at local midnight. */
export function todayBangkok() {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: BANGKOK_TZ,
    year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(new Date());
  const y = parts.find(p => p.type === 'year').value;
  const m = parts.find(p => p.type === 'month').value;
  const d = parts.find(p => p.type === 'day').value;
  return new Date(`${y}-${m}-${d}T00:00:00`);
}

/** Parse an ISO date string (YYYY-MM-DD) as a local calendar date (no TZ shift). */
export function parseISODate(iso) {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function toISODate(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** Whole calendar days from today (Bangkok) to the given ISO date. Can be negative. */
export function daysUntil(iso) {
  const today = todayBangkok();
  const target = parseISODate(iso);
  const msPerDay = 24 * 60 * 60 * 1000;
  return Math.round((target - today) / msPerDay);
}

/** 15 ก.พ. */
export function formatShortDate(iso) {
  const d = parseISODate(iso);
  return `${d.getDate()} ${THAI_MONTH_ABBR[d.getMonth()]}`;
}

/** กุมภาพันธ์ 2569 (Buddhist Era) */
export function formatMonthYear(year, monthIndex) {
  return `${THAI_MONTH_FULL[monthIndex]} ${year + 543}`;
}

export function thaiMonthAbbr(monthIndex) {
  return THAI_MONTH_ABBR[monthIndex];
}

/** ฿12,000 / $12.00 — comma separators, no decimals for whole numbers, else 2dp. */
export function formatMoney(amount, currency = 'THB') {
  const symbol = currency === 'USD' ? '$' : '฿';
  const isWhole = Math.abs(amount % 1) < 0.005;
  const formatted = amount.toLocaleString('en-US', {
    minimumFractionDigits: isWhole ? 0 : 2,
    maximumFractionDigits: 2,
  });
  return `${symbol}${formatted}`;
}

/** ฿419/mo — monthlyEq rounded to whole baht. */
export function formatMonthlyEq(amountThb) {
  return `฿${Math.round(amountThb).toLocaleString('en-US')}/mo`;
}

/* Money and dates the way Vietnamese buyers read them. */
const VND = new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 });
const DATE = new Intl.DateTimeFormat('vi-VN', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Ho_Chi_Minh' });

export const formatVnd = (amount: number): string => VND.format(amount);

export const formatDateTime = (iso: string): string => DATE.format(new Date(iso));

const CLOCK = new Intl.DateTimeFormat('vi-VN', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Ho_Chi_Minh' });
const DAY = new Intl.DateTimeFormat('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'Asia/Ho_Chi_Minh' });
const DAY_MS = 24 * 3600_000;

const dayOf = (ms: number) => Object.fromEntries(DAY.formatToParts(new Date(ms)).map(x => [x.type, x.value]));
const sameDay = (a: number, b: number) => DAY.format(new Date(a)) === DAY.format(new Date(b));

/** When something was written, said short (Vietnam time): "lúc 14:32" today, "hôm qua", then "ngày 12/10". */
export function formatWhen(ms: number, now = Date.now()): string {
  if (sameDay(ms, now)) return `lúc ${CLOCK.format(new Date(ms))}`;
  if (sameDay(ms, now - DAY_MS)) return 'hôm qua';
  const d = dayOf(ms);                                                  // "12/10": the locale alone writes "12-10"
  return `ngày ${d.day}/${d.month}`;
}

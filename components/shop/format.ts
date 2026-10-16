/* Money and dates the way Vietnamese buyers read them. */
const VND = new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 });
const DATE = new Intl.DateTimeFormat('vi-VN', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Ho_Chi_Minh' });

export const formatVnd = (amount: number): string => VND.format(amount);

export const formatDateTime = (iso: string): string => DATE.format(new Date(iso));

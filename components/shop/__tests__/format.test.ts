import { describe, expect, it } from 'vitest';
import { formatDateTime, formatVnd, formatWhen } from '../format';

describe('formatting for Vietnamese buyers', () => {
  it('writes VND with dots and the đồng sign', () => {
    expect(formatVnd(49000).replace(/\s/g, ' ')).toBe('49.000 ₫');
  });
  it('writes a time in Vietnam\'s time zone', () => {
    expect(formatDateTime('2026-10-16T03:05:00Z')).toContain('10:05');
  });
  it('says when a draft was written: the time today, then the day (Vietnam time)', () => {
    const now = Date.parse('2026-10-20T08:00:00Z');                           // 15:00 in Vietnam
    expect(formatWhen(Date.parse('2026-10-20T07:32:00Z'), now)).toBe('lúc 14:32');
    expect(formatWhen(Date.parse('2026-10-19T17:30:00Z'), now)).toBe('lúc 00:30');   // after midnight in Vietnam: today
    expect(formatWhen(Date.parse('2026-10-19T07:32:00Z'), now)).toBe('hôm qua');
    expect(formatWhen(Date.parse('2026-10-12T07:32:00Z'), now)).toBe('ngày 12/10');
  });
});

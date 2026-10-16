import { describe, expect, it } from 'vitest';
import { formatDateTime, formatVnd } from '../format';

describe('formatting for Vietnamese buyers', () => {
  it('writes VND with dots and the đồng sign', () => {
    expect(formatVnd(49000).replace(/\s/g, ' ')).toBe('49.000 ₫');
  });
  it('writes a time in Vietnam\'s time zone', () => {
    expect(formatDateTime('2026-10-16T03:05:00Z')).toContain('10:05');
  });
});

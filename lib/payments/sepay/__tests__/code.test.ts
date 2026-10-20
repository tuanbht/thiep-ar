import { describe, expect, it } from 'vitest';
import { carriesCode, orderCodeIn, paymentCode } from '../code';

describe('payment codes', () => {
  it('are the order code without its dashes', () => {
    expect(paymentCode('GC-261020-7K3QX')).toBe('GC2610207K3QX');
  });

  it('are found in a transfer message however the bank wrote it', () => {
    for (const text of ['GC2610207K3QX', 'ck gc2610207k3qx cam on', 'NGUYEN VAN A chuyen tien GC-261020-7K3QX', 'MBVCB.123.GC 261020 7K3QX.CT tu 0123'])
      expect(orderCodeIn(text), text).toBe('GC-261020-7K3QX');
    expect(orderCodeIn('chuyen tien an trua')).toBeNull();
    expect(orderCodeIn('GC261020')).toBeNull();
    expect(orderCodeIn('GC2610207K3Q0')).toBeNull();                 // 0 is never in a code (it reads like O)
  });

  it('match a message that carries them', () => {
    expect(carriesCode('ck GC 2610207K3QX', 'GC2610207K3QX')).toBe(true);
    expect(carriesCode('ck GC2610207K3QY', 'GC2610207K3QX')).toBe(false);
  });
});

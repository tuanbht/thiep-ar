import { describe, expect, it } from 'vitest';
import { CARD_DEFAULTS, mergeCard, safeId } from '../card';

describe('card', () => {
  it('fills every field and keeps only the right types', () => {
    const c = mergeCard({ template: 'mochi', title: 7, letter: { body: ['a', 2, null] }, slots: { board: 'Hi', n: 3, bad: {} }, design: '../x' });
    expect(c).toMatchObject({ template: 'mochi', title: '7', design: 'x', slots: { board: 'Hi', n: '3' } });
    expect(c.letter).toEqual({ to: CARD_DEFAULTS.letter.to, body: ['a', '2', ''], from: CARD_DEFAULTS.letter.from });
    expect(mergeCard(null).template).toBe('night-mail');
    expect(mergeCard({ design: '' })).not.toHaveProperty('design');
  });

  it('keeps ids to safe path segments', () => {
    expect(safeId('../a b/c')).toBe('abc');
    expect(safeId(undefined)).toBe('');
  });

});

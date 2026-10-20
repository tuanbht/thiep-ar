import { describe, expect, it } from 'vitest';
import { QUERY_MAX, readShelfParams, shelfHref, tidyQuery } from '../shelfQuery';

describe('the shelf in the address', () => {
  it('reads the words and the category, tidied', () => {
    expect(readShelfParams({ q: '  mưa   ngày  ', c: 'love' })).toEqual({ q: 'mưa ngày', c: 'love' });
    expect(readShelfParams({ q: ['biển', 'núi'], c: ['fun', 'love'] })).toEqual({ q: 'biển', c: 'fun' });   // the first of each
    expect(readShelfParams({})).toEqual({ q: '', c: null });
    expect(readShelfParams({ q: 'x'.repeat(200) }).q).toHaveLength(QUERY_MAX);
  });

  it('tidies words the same way on both sides: spaces, characters a database refuses, nothing searchable', () => {
    expect(tidyQuery('  mưa \t  rào ')).toBe('mưa rào');
    expect(tidyQuery('mưa\u0000rào\u007f')).toBe('mưa rào');                 // a scanner's ?q=%00
    expect(tidyQuery('!!! … ')).toBe('');                                      // no letter or digit: no search
    expect(readShelfParams({ q: '\u0000' }).q).toBe('');
  });

  it('ignores a category that cannot be one', () => {
    for (const c of ['Love', '../x', "love' or 1=1", '', '-x', 'a'.repeat(80)]) expect(readShelfParams({ c }).c, c).toBeNull();
  });

  it('writes the shelf\'s address back, leaving out what is empty', () => {
    expect(shelfHref({})).toBe('/');
    expect(shelfHref({ q: '  ', c: null }, '#shelf')).toBe('/#shelf');
    expect(shelfHref({ q: 'mưa ngày', c: 'love' })).toBe('/?q=m%C6%B0a+ng%C3%A0y&c=love');
    expect(shelfHref({ c: 'fun' }, '#shelf')).toBe('/?c=fun#shelf');
  });
});

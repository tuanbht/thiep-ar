// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { FormField } from '@/lib/catalog/form';
import type { CustomizeValues } from '../customize';
import { clearDraft, isPristine, loadDraft, mergeDraft, PHOTO_FRESH_MS, saveDraft, type Draft } from '../draft';
import { hasDraft, markDraftOrdered, releaseDraft } from '../draftStore';

const NOW = Date.parse('2026-10-20T08:00:00Z');
const fields: FormField[] = [{ slot: 'note1', label: 'Lời 1', value: 'Chào em', max: 20 }, { slot: ['sign', 'caption'], label: 'Biển', value: 'Hi', max: 10 }];
const defaults: CustomizeValues = { title: 'Thiệp', intro: 'Đặt thiệp nằm phẳng', to: 'Gửi em,', body: [{ text: 'Một đoạn.' }], from: 'Anh', words: { note1: 'Chào em', sign: 'Hi' } };
const PATH = 'drafts/0b5c2a52-6a8e-4a43-9c7f-3d2b1e0f9a11.jpg';
const draft = (over: Partial<Draft> = {}): Draft => ({
  values: { ...defaults, title: 'Thiệp của mình', words: { note1: 'Thương em', sign: 'Hi' } },
  photo: { path: PATH, preview: 'data:image/jpeg;base64,AAAA', uploadedAt: NOW - 3600_000 },
  savedAt: NOW - 60_000,
  ...over
});

beforeEach(() => localStorage.clear());
afterEach(() => vi.restoreAllMocks());

describe('the draft kept in this browser', () => {
  it('comes back as it was saved, one per card', () => {
    expect(saveDraft('mochi', draft())).toBe(true);
    expect(loadDraft('mochi', NOW)).toEqual({ ...draft(), photoExpired: false });
    expect(loadDraft('pip', NOW)).toBeNull();
    clearDraft('mochi');
    expect(loadDraft('mochi', NOW)).toBeNull();
  });

  it('leaves out a photo uploaded too long ago (the nightly cleanup removes it), and keeps the words', () => {
    saveDraft('mochi', draft({ photo: { path: PATH, preview: null, uploadedAt: NOW - PHOTO_FRESH_MS - 1 } }));
    expect(loadDraft('mochi', NOW)).toMatchObject({ photo: null, photoExpired: true, values: { title: 'Thiệp của mình' } });
  });

  it('keeps the words but not a photo that is not an upload of ours', () => {
    localStorage.setItem('gc:draft:mochi', JSON.stringify({ v: 1, ...draft(), photo: { path: '../../secret.jpg', preview: null, uploadedAt: NOW } }));
    expect(loadDraft('mochi', NOW)).toMatchObject({ photo: null, photoExpired: false, values: { title: 'Thiệp của mình' } });
  });

  it('is let go once the order made from it is paid, and only then', () => {
    saveDraft('mochi', draft());
    markDraftOrdered('mochi', 'o1');
    releaseDraft('mochi', 'o2');                                    // another order of the same card, paid later
    expect(hasDraft('mochi')).toBe(true);
    releaseDraft('mochi', 'o1');
    expect(hasDraft('mochi')).toBe(false);
  });

  it('is no longer the order\'s once it is written again', () => {
    saveDraft('mochi', draft());
    markDraftOrdered('mochi', 'o1');
    saveDraft('mochi', draft({ values: { ...defaults, title: 'Sửa sau khi đặt' } }));   // edited after ordering
    releaseDraft('mochi', 'o1');
    expect(loadDraft('mochi', NOW)?.values.title).toBe('Sửa sau khi đặt');
  });

  it('forgets what it cannot read, and a draft a month old', () => {
    for (const raw of ['{not json', JSON.stringify({ v: 99 }), JSON.stringify({ v: 1, savedAt: NOW, values: { title: 5 } })]) {
      localStorage.setItem('gc:draft:mochi', raw);
      expect(loadDraft('mochi', NOW), raw).toBeNull();
      expect(localStorage.getItem('gc:draft:mochi')).toBeNull();
    }
    saveDraft('mochi', draft({ savedAt: NOW - 31 * 24 * 3600_000 }));
    expect(loadDraft('mochi', NOW)).toBeNull();
  });

  it('drops the photo preview when the browser is short of space, and says so when it cannot save at all', () => {
    const real = Storage.prototype.setItem;
    let calls = 0;
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(function (this: Storage, k: string, v: string) {
      if (calls++ === 0) throw new DOMException('full', 'QuotaExceededError');
      real.call(this, k, v);
    });
    expect(saveDraft('mochi', draft())).toBe(true);
    expect(loadDraft('mochi', NOW)?.photo).toEqual({ path: PATH, preview: null, uploadedAt: NOW - 3600_000 });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new DOMException('full', 'QuotaExceededError'); });
    expect(saveDraft('mochi', draft())).toBe(false);
  });

  it('copes with storage switched off (a private window, blocked site data)', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new DOMException('denied', 'SecurityError'); });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new DOMException('denied', 'SecurityError'); });
    vi.spyOn(Storage.prototype, 'removeItem').mockImplementation(() => { throw new DOMException('denied', 'SecurityError'); });
    expect(loadDraft('mochi', NOW)).toBeNull();
    expect(saveDraft('mochi', draft())).toBe(false);
    expect(() => clearDraft('mochi')).not.toThrow();
    expect(() => markDraftOrdered('mochi', 'o1')).not.toThrow();
    expect(() => releaseDraft('mochi', 'o1')).not.toThrow();
    expect(hasDraft('mochi')).toBe(false);
  });
});

describe('mergeDraft', () => {
  it('fits a saved draft to the card as it is now: its fields, as many paragraphs as a letter takes', () => {
    const saved = { ...defaults, title: 'T'.repeat(200), body: Array.from({ length: 20 }, (_, i) => ({ text: `đoạn ${i}` })),
      words: { note1: 'x'.repeat(50), retired: 'gone' } };
    const m = mergeDraft(saved, defaults, fields);
    expect(m.title).toHaveLength(200);                                        // too long is kept as written: the form says so
    expect(m.body).toHaveLength(12);
    expect(m.words).toEqual({ note1: 'x'.repeat(50), sign: 'Hi' });          // an old field is dropped, a new one starts as written
  });

  it('keeps at least one paragraph to write in', () => {
    expect(mergeDraft({ ...defaults, body: [] }, defaults, fields).body).toEqual([{ text: '' }]);
  });
});

describe('isPristine', () => {
  it('is true only while nothing differs from how the card starts', () => {
    expect(isPristine(defaults, defaults)).toBe(true);
    expect(isPristine({ ...defaults, body: [{ text: 'Một đoạn.' }, { text: '' }] }, defaults)).toBe(false);
    expect(isPristine({ ...defaults, words: { ...defaults.words, sign: 'Yo' } }, defaults)).toBe(false);
  });
});

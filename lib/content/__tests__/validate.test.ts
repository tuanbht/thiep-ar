import { describe, expect, it } from 'vitest';
import { giftContentInputSchema } from '../../api/dto';
import type { FormSpec } from '../../catalog/form';
import { InvalidInput } from '../../orders/errors';
import { catalog } from '../../orders/__tests__/test-kit';
import { cleanText, validateContent } from '../validate';

const form = async (id: string) => (await catalog.getTemplateInfo(id))!.form!;
const input = (over: Record<string, unknown> = {}) => giftContentInputSchema.parse({
  title: 'Gửi Hanna', letter: { to: 'Hanna à,', body: ['Một', 'Hai'], from: 'Anh' }, ...over
});
const issues = (f: () => unknown): string[] => { try { f(); } catch (e) { if (e instanceof InvalidInput) return e.issues; throw e; } return []; };

describe('validateContent', () => {
  it('keeps the words for the slots the form writes, and the form\'s own words for the ones left out', async () => {
    const f = await form('one-station-per-year');
    const c = validateContent(input({ slots: { 'cap0-l': '  Năm đầu tiên  ' } }), f);
    expect(c.slots['cap0-l']).toBe('Năm đầu tiên');
    expect(c.slots.sign0).toBeTruthy();                       // a field writing two slots (sign0 and cap0-k) fills both
    expect(c.slots.sign0).toBe(c.slots['cap0-k']);
  });

  it('keeps a slot the buyer emptied empty', async () => {
    expect(validateContent(input({ slots: { board: '' } }), await form('flower-letter')).slots.board).toBe('');
  });

  it('refuses a slot the template does not have', async () => {
    expect(issues(() => validateContent(input({ slots: { board: 'x', secret: 'y' } }), null))).toEqual(
      ['Thiệp này không có một trong các ô chữ đã gửi.', 'Thiệp này không có một trong các ô chữ đã gửi.']);   // never echoes what was sent
  });

  it('refuses words longer than their slot holds, counting characters not bytes', async () => {
    const f: FormSpec = { label: 'x', preset: { title: '', intro: '', to: '', body: [], from: '' },
      groups: [{ title: 'g', rows: [[{ slot: 'board', label: 'Board', value: '', max: 5 }]] }] };
    expect(validateContent(input({ slots: { board: 'Tiếng' } }), f).slots.board).toBe('Tiếng');   // 5 letters, more bytes
    expect(issues(() => validateContent(input({ slots: { board: 'Tiếng Việt' } }), f))).toEqual(['Một ô chữ dài quá: tối đa 5 ký tự.']);
  });


  it('needs a letter with at least one paragraph', () => {
    expect(issues(() => validateContent(input({ letter: { to: 'A', body: ['   ', ''], from: 'B' } }), null))).toEqual(['Thư cần ít nhất một đoạn.']);
  });

  it('drops empty paragraphs and cleans the text', () => {
    const c = validateContent(input({ title: 'Gúi\u0007 Hanna', letter: { to: 'A', body: ['Một\r\nhai', '', 'Ba'], from: 'B' } }), null);
    expect(c.title).toBe('Gúi Hanna');
    expect(c.letter.body).toEqual(['Một\nhai', 'Ba']);
  });

  it('passes the photo through', () => {
    const photoPath = 'drafts/12345678-1234-4123-8123-123456789abc.jpg';
    expect(validateContent(input({ photoPath }), null).photoPath).toBe(photoPath);
  });
});

describe('cleanText', () => {
  it('keeps line breaks and tabs, drops other control characters', () => {
    expect(cleanText('a\tb\nc\u0000d\u001be\u007f')).toBe('a\tb\ncde');
  });
});

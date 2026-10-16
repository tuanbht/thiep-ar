import { describe, expect, it } from 'vitest';
import type { FormSpec } from '@/lib/catalog/form';
import { allFields, customizeSchema, fieldKey, formDefaults, orderRequest, toContent, type CustomizeValues } from '../customize';

const form: FormSpec = {
  label: 'x',
  preset: { title: 'Gửi Hanna', intro: '', to: 'Hanna à,', body: ['Một', 'Hai'], from: 'Yêu em' },
  groups: [
    { title: 'Bảng', rows: [[{ slot: 'board', label: 'Board', value: 'Hi', max: 40 }]] },
    { title: 'Biển', rows: [[{ slot: ['sign0', 'cap0-k'], label: 'Sign', value: 'A' }]] }
  ]
};
const fields = allFields(form.groups);
const ok: CustomizeValues = formDefaults(form);
const errorsOf = (v: CustomizeValues) => {
  const r = customizeSchema(fields).safeParse(v);
  return r.success ? {} : Object.fromEntries(r.error.issues.map(i => [i.path.join('.'), i.message]));
};

describe('the form\'s values', () => {
  it('start from the template\'s words, one value per field (under its first slot)', () => {
    expect(fields.map(fieldKey)).toEqual(['board', 'sign0']);
    expect(ok).toEqual({ title: 'Gửi Hanna', intro: '', to: 'Hanna à,', body: [{ text: 'Một' }, { text: 'Hai' }], from: 'Yêu em',
      words: { board: 'Hi', sign0: 'A' } });
    expect(formDefaults({ ...form, preset: { ...form.preset, body: [] } }).body).toEqual([{ text: '' }]);   // always one paragraph to write in
  });

  it('become gift content, a field\'s words in every slot it fills', () => {
    expect(toContent({ ...ok, words: { board: 'Chào', sign0: 'B' } }, fields, 'drafts/x.jpg')).toEqual({
      title: 'Gửi Hanna', intro: '', letter: { to: 'Hanna à,', body: ['Một', 'Hai'], from: 'Yêu em' },
      slots: { board: 'Chào', sign0: 'B', 'cap0-k': 'B' }, photoPath: 'drafts/x.jpg'
    });
  });

  it('become an order request: trimmed, empty paragraphs dropped, no stray slots, no buyer', () => {
    const content = toContent({ ...ok, title: '  Gửi Hanna ', body: [{ text: ' Một ' }, { text: '  ' }, { text: 'Hai' }], words: { board: ' Hi ', sign0: 'A' } }, fields, null);
    expect(orderRequest('mochi', { ...content, slots: { ...content.slots, stray: 'x' } }, fields)).toEqual({
      productId: 'mochi',
      content: { title: 'Gửi Hanna', intro: '', letter: { to: 'Hanna à,', body: ['Một', 'Hai'], from: 'Yêu em' }, slots: { board: 'Hi', sign0: 'A', 'cap0-k': 'A' }, photoPath: null }
    });
  });
});

describe('the form\'s rules', () => {
  it('pass the template\'s own words', () => {
    expect(errorsOf(ok)).toEqual({});
  });

  it('ask for the title, the letter\'s opening, one paragraph and its signature', () => {
    expect(errorsOf({ ...ok, title: ' ', to: '', body: [{ text: ' ' }, { text: '' }], from: '' }))
      .toEqual({ title: 'Cần điền', to: 'Cần điền', 'body.0.text': 'Cần điền', from: 'Cần điền' });
  });

  it('say what is too long, by field, with the template\'s own limits', () => {
    const long = (n: number) => 'x'.repeat(n);
    expect(errorsOf({ ...ok, intro: long(301), body: [{ text: 'ok' }, { text: long(1201) }], words: { board: long(41), sign0: long(201) } })).toEqual({
      intro: 'Tối đa 300 ký tự', 'body.1.text': 'Tối đa 1200 ký tự', 'words.board': 'Tối đa 40 ký tự', 'words.sign0': 'Tối đa 200 ký tự'
    });
  });

  it('keep the letter to twelve paragraphs', () => {
    expect(Object.keys(errorsOf({ ...ok, body: Array.from({ length: 13 }, () => ({ text: 'a' })) }))).toEqual(['body']);
  });
});

/* What the shop needs to know about a template, read from its files in public/templates/<id>/: template.json (kind,
   aspect, stops) and form.json (what the buyer fills in). Read once per process in production; read fresh in
   development, so an edited form shows at once. */
import 'server-only';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { z } from 'zod';
import { formSpecSchema, type FormSpec } from './form';
import { kindOf, parseTemplate } from '../player/core/template';
import type { Kind } from '../domain/types';

export interface TemplateInfo {
  id: string;
  name: string;
  kind: Kind;
  aspect: number;
  /** how many stops the act has */
  chapters: number;
  /** the template's own hint at each stop */
  /** null when the template has no form.json (or a broken one): it cannot be customised */
  form: FormSpec | null;
  /** who made the free 3D models the act uses (template.json "credits", written by scripts/pack-models.mjs) */
  credits: Credit[];
}

export interface Credit { model: string; author: string; license: string; url?: string }

const creditSchema = z.object({ model: z.string().min(1).max(80), author: z.string().min(1).max(120), license: z.string().min(1).max(40),
  url: z.url({ protocol: /^https$/ }).max(300).optional() });

/** the credits that are well formed; a broken one is left out rather than breaking the page */
function creditsOf(raw: unknown): Credit[] {
  return Array.isArray(raw) ? raw.flatMap(c => { const r = creditSchema.safeParse(c); return r.success ? [r.data] : []; }).slice(0, 6) : [];
}

const ID = /^[a-z0-9][a-z0-9_-]*$/i;

async function readJsonFile(file: string): Promise<unknown | undefined> {
  try { return JSON.parse(await readFile(file, 'utf8')); }
  catch (e) {
    if ((e as NodeJS.ErrnoException).code === 'ENOENT') return undefined;
    console.error(`[catalog] ${file} could not be read`, e);
    return undefined;
  }
}

export function createTemplateCatalog(dir: string, { cache = true }: { cache?: boolean } = {}) {
  const memo = new Map<string, Promise<TemplateInfo | null>>();

  async function load(id: string): Promise<TemplateInfo | null> {
    const raw = await readJsonFile(path.join(dir, id, 'template.json'));
    if (raw === undefined) return null;
    let tpl;
    try { tpl = parseTemplate(raw); } catch (e) { console.error(`[catalog] ${id}/template.json is not a template`, e); return null; }
    const formRaw = await readJsonFile(path.join(dir, id, 'form.json'));
    let form: FormSpec | null = null;
    if (formRaw !== undefined) {
      const r = formSpecSchema.safeParse(formRaw);
      if (r.success) form = r.data;
      else console.error(`[catalog] ${id}/form.json does not fit the form spec: ${r.error.issues.map(i => i.path.join('.')).join(', ')}`);
    }
    return {
      id,
      name: typeof tpl.name === 'string' && tpl.name.trim() ? tpl.name : id,
      kind: kindOf(tpl),
      aspect: tpl.aspect,
      chapters: tpl.chapters.length,
      form,
      credits: creditsOf(tpl.credits)
    };
  }

  return {
    getTemplateInfo(id: string): Promise<TemplateInfo | null> {
      if (!ID.test(id)) return Promise.resolve(null);
      if (!cache) return load(id);
      let p = memo.get(id);
      if (!p) { p = load(id); memo.set(id, p); }
      return p;
    }
  };
}

const catalog = createTemplateCatalog(path.join(process.cwd(), 'public', 'templates'), { cache: process.env.NODE_ENV === 'production' });

export const getTemplateInfo = (id: string): Promise<TemplateInfo | null> => catalog.getTemplateInfo(id);

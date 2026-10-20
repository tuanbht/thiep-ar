'use client';
/* Writing the card: the start screen, the act's words (from the template's form.json), the letter and a photo; the live
   preview plays it beside the form as it is written. react-hook-form holds the values and checks them against the
   template's own rules (customize.ts); "Mua" places the order and goes to the checkout. */
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, useSyncExternalStore, type ReactNode } from 'react';
import { Controller, useFieldArray, useForm, useWatch, type Control, type FieldPath } from 'react-hook-form';
import type { CreateOrderResponse } from '@/lib/api/dto';
import { LIMITS } from '@/lib/api/dto';
import type { FormSpec } from '@/lib/catalog/form';
import { toCard } from '@/lib/content/toCard';
import type { Product } from '@/lib/domain/types';
import type { PlayerEvent } from '@/components/player/types';
import { allFields, customizeSchema, fieldKey, formDefaults, orderRequest, toContent, type CustomizeValues } from './customize';
import { DraftNote } from './DraftNote';
import { track } from './events';
import { Field, Section } from './fields';
import { formatVnd } from './format';
import { PhotoField, type PhotoState } from './PhotoField';
import { PreviewPanel } from './PreviewPanel';
import { S } from './strings';
import { useDraft } from './useDraft';

export interface CustomizeFormProps {
  product: Product;
  form: FormSpec;
}

const DESKTOP = '(min-width: 1024px)';
const subscribeDesktop = (cb: () => void) => { const m = matchMedia(DESKTOP); m.addEventListener('change', cb); return () => m.removeEventListener('change', cb); };
const useDesktop = () => useSyncExternalStore(subscribeDesktop, () => matchMedia(DESKTOP).matches, () => false);

/** A text field the form owns: its value, its first problem, and its input for focusing that problem. */
function FormText(p: { control: Control<CustomizeValues>; name: FieldPath<CustomizeValues>; label: string; max?: number; required?: boolean;
  multiline?: boolean; rows?: number; className?: string; aside?: ReactNode }) {
  return (
    <Controller control={p.control} name={p.name} render={({ field, fieldState }) => (
      <Field label={p.label} max={p.max} required={p.required} multiline={p.multiline} rows={p.rows} className={p.className} aside={p.aside}
        value={typeof field.value === 'string' ? field.value : ''} onChange={field.onChange} onBlur={field.onBlur} inputRef={field.ref}
        name={field.name} error={fieldState.error?.message ?? null} />
    )} />
  );
}

export function CustomizeForm({ product, form }: CustomizeFormProps) {
  const router = useRouter();
  const fields = useMemo(() => allFields(form.groups), [form.groups]);
  const schema = useMemo(() => customizeSchema(fields), [fields]);
  const defaults = useMemo(() => formDefaults(form), [form]);
  const { control, handleSubmit, setError, reset, getValues, formState: { errors, isSubmitting } } = useForm<CustomizeValues>({
    resolver: zodResolver(schema),
    defaultValues: defaults,
    mode: 'onTouched'
  });
  const paragraphs = useFieldArray({ control, name: 'body' });
  const values = useWatch({ control }) as CustomizeValues;
  const [photo, setPhoto] = useState<PhotoState>({ path: null, previewUrl: null });
  const [uploading, setUploading] = useState(false);
  const [leaving, setLeaving] = useState(false);                     // the order is placed: the checkout is loading
  const desktop = useDesktop();
  const [previewOpen, setPreviewOpen] = useState(false);
  const showPreview = desktop || previewOpen;
  const started = useRef(false), previewed = useRef(false), first = useRef(true);
  const draft = useDraft({                                              // a reload brings the card back (this browser only)
    productId: product.id, fields, defaults, values, photo, read: getValues,
    restore: useCallback((v: CustomizeValues, p: PhotoState) => { started.current = true; reset(v); setPhoto(p); }, [reset])
  });
  const startOver = () => { reset(defaults); setPhoto({ path: null, previewUrl: null }); draft.discard(); };
  useLayoutEffect(() => () => setLeaving(false), []);                  // Back from the checkout: this page again, ready to buy

  const content = useMemo(() => toContent(values, fields, photo.path), [values, fields, photo.path]);
  const card = useMemo(() => toCard(content, product, photo.previewUrl), [content, product, photo.previewUrl]);

  useEffect(() => { track({ name: 'product_view', productId: product.id }); }, [product.id]);
  useEffect(() => {
    if (showPreview && !previewed.current) { previewed.current = true; track({ name: 'preview_open', productId: product.id }); }
  }, [showPreview, product.id]);
  useEffect(() => {                                                    // the first edit counts as starting to write
    if (first.current) { first.current = false; return; }
    if (!started.current) { started.current = true; track({ name: 'customize_start', productId: product.id }); }
  }, [values, product.id]);

  const onPlayerEvent: PlayerEvent = (name, props) => {
    if (name === 'chapter_reached' || name === 'letter_open') track({ name, productId: product.id, props: { ...props, where: 'preview' } });
  };

  const buy = handleSubmit(async v => {
    if (uploading) { setError('root.server', { message: S.product.waitPhoto }); return; }      // the photo would be left out
    track({ name: 'checkout_start', productId: product.id });
    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(orderRequest(product.id, toContent(v, fields, photo.path), fields))
      });
      const json = (await res.json().catch(() => ({}))) as Partial<CreateOrderResponse> & { error?: string };
      if (!res.ok || !json.checkoutUrl) throw new Error(json.error || S.product.orderFailed);
      if (json.orderId) draft.ordered(json.orderId);
      setLeaving(true);
      router.push(json.checkoutUrl);
    } catch (e) {
      setError('root.server', { message: e instanceof Error ? e.message : S.product.orderFailed });
    }
  }, () => setError('root.server', { message: S.product.fixErrors }));

  const sending = isSubmitting || leaving;
  const serverError = errors.root?.server?.message ?? null;

  return (
    <form onSubmit={e => void buy(e)} noValidate
      className="mx-auto grid w-full max-w-7xl gap-10 px-4 pb-28 sm:px-8 lg:grid-cols-[minmax(0,1fr)_minmax(340px,0.85fr)] lg:pb-20">
      {/* the preview: beside the form on a wide screen, above it (on demand) on a phone */}
      <div className="lg:order-2">
        <div className="lg:sticky lg:top-6">
          {!desktop && (
            <button type="button" onClick={() => setPreviewOpen(o => !o)} aria-expanded={previewOpen}
              className="sign mb-4 flex w-full items-center justify-between rounded-sm border border-white/15 bg-night-2 px-4 py-3 text-xs text-paper transition-colors hover:border-gold/60">
              {previewOpen ? S.product.hidePreview : S.product.showPreview}
              <span aria-hidden="true" className={`transition-transform duration-300 ${previewOpen ? 'rotate-180' : ''}`}>▾</span>
            </button>
          )}
          {showPreview && <PreviewPanel card={card} onEvent={onPlayerEvent} />}
        </div>
      </div>

      <div className="grain ruled relative bg-paper px-5 py-8 text-ink shadow-[var(--shadow-paper)] sm:px-10 sm:py-12 lg:order-1">
        <div className="airmail absolute inset-x-0 top-0 h-1.5" aria-hidden="true" />
        <DraftNote status={draft} dirty={draft.dirty} busy={uploading} onStartOver={startOver} />
        <div className="space-y-12">
          <Section n="01" id="opening" title={S.product.sections.opening} note={S.product.sections.openingNote}>
            <FormText control={control} name="title" label={S.product.fields.title} max={LIMITS.title} required />
            <FormText control={control} name="intro" label={S.product.fields.intro} max={LIMITS.intro} multiline rows={2} />
          </Section>

          {form.groups.length > 0 && (
            <Section n="02" id="words" title={S.product.sections.words}>
              {form.groups.map((g, gi) => (
                <fieldset key={gi} className="space-y-5">
                  <legend className="mb-3">
                    <span className="font-hand text-2xl text-post">{g.title}</span>
                    {g.note && <span className="mt-1 block text-sm italic text-ink-2">{g.note}</span>}
                  </legend>
                  {g.rows.map((row, ri) => (
                    <div key={ri} className="grid gap-5 sm:grid-flow-col sm:auto-cols-fr">
                      {row.map(f => (
                        <FormText key={fieldKey(f)} control={control} name={`words.${fieldKey(f)}`} label={f.label} max={f.max} multiline={f.multiline}
                          rows={2} className={f.narrow ? 'sm:max-w-[12rem]' : ''} />
                      ))}
                    </div>
                  ))}
                </fieldset>
              ))}
            </Section>
          )}

          <Section n="03" id="letter" title={S.product.sections.letter} note={S.product.sections.letterNote}>
            <FormText control={control} name="to" label={S.product.fields.to} max={LIMITS.to} required />
            {paragraphs.fields.map((p, i) => (
              <FormText key={p.id} control={control} name={`body.${i}.text`} label={`${S.product.fields.paragraph} ${i + 1}`} max={LIMITS.paragraph} multiline rows={4}
                aside={paragraphs.fields.length > 1 && (
                  <button type="button" onClick={() => paragraphs.remove(i)} className="sign text-[0.65rem] text-ink-3 underline-offset-4 hover:text-post hover:underline">
                    {S.product.fields.removeParagraph}
                  </button>
                )} />
            ))}
            {paragraphs.fields.length < LIMITS.paragraphs && (
              <button type="button" onClick={() => paragraphs.append({ text: '' })}
                className="sign rounded-full border border-dashed border-ink/40 px-4 py-2 text-xs text-ink-2 transition-colors hover:border-ink hover:text-ink">
                + {S.product.fields.addParagraph}
              </button>
            )}
            <FormText control={control} name="from" label={S.product.fields.from} max={LIMITS.from} required />
          </Section>

          <Section n="04" id="photo" title={S.product.sections.photo} note={S.product.sections.photoNote}>
            <PhotoField value={photo} onChange={setPhoto} onBusy={setUploading} lost={draft.photoLost} />
          </Section>
        </div>

        {/* the till: on a phone it stays at the bottom of the screen */}
        <div className="fixed inset-x-0 bottom-0 z-30 border-t border-ink/15 bg-paper/95 px-4 py-3 backdrop-blur sm:px-8 lg:static lg:mt-12 lg:border-t-2 lg:border-ink lg:bg-transparent lg:px-0 lg:pb-0 lg:pt-6 lg:backdrop-blur-none">
          {serverError && <p role="alert" className="mb-3 text-sm font-medium text-post">{serverError}</p>}
          <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
            <p className="leading-none">
              <span className="sign block text-[0.65rem] text-ink-2">{S.product.total}</span>
              <span className="font-sign text-3xl font-extrabold tabular-nums text-ink">{formatVnd(product.priceVnd)}</span>
            </p>
            <button type="submit" disabled={sending || uploading}
              className="sign group inline-flex items-center gap-3 rounded-full bg-post px-7 py-4 text-sm font-bold text-paper shadow-[0_14px_30px_-14px_rgb(200_55_45/0.9)] transition-[transform,background-color,opacity] duration-300 hover:bg-post-deep active:scale-[0.98] disabled:cursor-wait disabled:opacity-70">
              {sending ? S.product.buying : uploading ? S.product.fields.uploading : S.product.buy}
              {!sending && !uploading && <span aria-hidden="true" className="transition-transform duration-300 group-hover:translate-x-1">→</span>}
            </button>
          </div>
        </div>
      </div>
    </form>
  );
}

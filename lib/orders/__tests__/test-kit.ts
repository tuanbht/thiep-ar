/* Shared by the server's tests: an OrdersService on memory with a fixed clock, real template files, fake photos. */
import path from 'node:path';
import { createTemplateCatalog } from '../../catalog/templates';
import { MemoryRepository } from '../../db/memory-repository';
import type { Product } from '../../domain/types';
import { TestPaymentProvider } from '../../payments/test-provider';
import type { PhotoExt, PhotoStore } from '../photo';
import { OrdersService, type OrdersDeps } from '../service';

export const PRODUCTS: Product[] = [
  { id: 'flower-letter', template: 'flower-letter', design: null, name: 'Thư hoa', blurb: 'Hoa nở từ phong bì', kind: '3d', priceVnd: 49000, active: true, sort: 1, tags: [], categories: [] },
  { id: 'mochi', template: 'mochi', design: null, name: 'Mochi', blurb: null, kind: '3d', priceVnd: 59000, active: true, sort: 2, tags: [], categories: [] },
  { id: 'retired', template: 'pip', design: null, name: 'Pip (old)', blurb: null, kind: '3d', priceVnd: 39000, active: false, sort: 3, tags: [], categories: [] },
  { id: 'ghost', template: 'no-such-template', design: null, name: 'Ghost', blurb: null, kind: '3d', priceVnd: 1000, active: true, sort: 4, tags: [], categories: [] }
];

export const FIXED_NOW = new Date('2026-10-16T18:30:00Z');   // 01:30 on 17 Oct in Vietnam

export class FakePhotos implements PhotoStore {
  readonly kept = new Map<string, Uint8Array>();
  private n = 0;
  async uploadDraftPhoto(bytes: Uint8Array, ext: PhotoExt): Promise<string> {
    const path = `drafts/00000000-0000-4000-8000-${String(++this.n).padStart(12, '0')}.${ext}`;
    this.kept.set(path, bytes);
    return path;
  }
  async exists(p: string): Promise<boolean> {
    return this.kept.has(p);
  }

  async signedUrl(p: string, seconds: number): Promise<string> {
    return `https://storage.test/${p}?expires=${seconds}`;
  }
}

export const catalog = createTemplateCatalog(path.join(process.cwd(), 'public', 'templates'));

export function makeService(over: Partial<OrdersDeps> = {}) {
  const repo = new MemoryRepository(PRODUCTS, () => FIXED_NOW);
  const photos = new FakePhotos();
  const orders = new OrdersService({
    repo,
    photos,
    templates: id => catalog.getTemplateInfo(id),
    makeProvider: confirm => new TestPaymentProvider(confirm, () => FIXED_NOW),
    now: () => FIXED_NOW,
    ...over
  });
  return { repo, photos, orders };
}

/** a card for the flower letter, as a browser sends it */
export const flowerOrder = (over: Record<string, unknown> = {}) => ({
  productId: 'flower-letter',
  content: {
    title: 'Gửi Hanna',
    intro: 'Mở camera nhé',
    letter: { to: 'Hanna à,', body: ['Nhân ngày 20/10, anh muốn nói...', '', 'Yêu em.'], from: 'Anh' },
    slots: { board: "Happy Women's Day Hanna" },
    photoPath: null
  },
  buyer: {},
  ...over
});

/** the first bytes of real image files */
export const JPEG = Uint8Array.from([0xff, 0xd8, 0xff, 0xe0, 0, 0x10, 0x4a, 0x46, 0x49, 0x46]);
export const PNG = Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0x0d]);
export const WEBP = Uint8Array.from([0x52, 0x49, 0x46, 0x46, 0x24, 0, 0, 0, 0x57, 0x45, 0x42, 0x50, 0x56, 0x50]);

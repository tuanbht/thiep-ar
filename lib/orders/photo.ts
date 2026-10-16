/* A photo is what its first bytes say it is, never what its name or the browser claims: JPEG, PNG or WebP only. */

export type PhotoExt = 'jpg' | 'png' | 'webp';

export const PHOTO_TYPES: Record<PhotoExt, string> = { jpg: 'image/jpeg', png: 'image/png', webp: 'image/webp' };

const starts = (b: Uint8Array, sig: number[], at = 0) => b.length >= at + sig.length && sig.every((v, i) => b[at + i] === v);

export function sniffPhoto(b: Uint8Array): PhotoExt | null {
  if (starts(b, [0xff, 0xd8, 0xff])) return 'jpg';
  if (starts(b, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return 'png';
  if (starts(b, [0x52, 0x49, 0x46, 0x46]) && starts(b, [0x57, 0x45, 0x42, 0x50], 8)) return 'webp';   // RIFF....WEBP
  return null;
}

/** Where photos are kept, as the orders service needs it (lib/db/photos.ts implements it on Supabase Storage). */
export interface PhotoStore {
  /** keeps a new photo and returns its path (drafts/<uuid>.<ext>) */
  uploadDraftPhoto(bytes: Uint8Array, ext: PhotoExt): Promise<string>;
  /** a link to the photo that works for `seconds` */
  signedUrl(path: string, seconds: number): Promise<string>;
  /** whether a photo is still kept at `path` */
  exists(path: string): Promise<boolean>;
}

/** Decodes and writes a photo again (no metadata, upright, a sensible size); throws if it is not really an image. */
export type PhotoCleaner = (bytes: Uint8Array, ext: PhotoExt) => Promise<{ bytes: Uint8Array; ext: PhotoExt }>;

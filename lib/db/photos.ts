/* The buyers' photos, in the private Storage bucket gift-photos. A photo is uploaded while the card is being written
   (drafts/<uuid>.<ext>, before anything is bought) and shown through short-lived signed links only. */
import 'server-only';
import { randomUUID } from 'node:crypto';
import { getAdminClient, type Db } from './client';
import { RepositoryError } from './repository';

export const PHOTO_BUCKET = 'gift-photos';
export type PhotoExt = 'jpg' | 'png' | 'webp';
const PATH = /^drafts\/[0-9a-f-]{36}\.(jpg|png|webp)$/;

export async function uploadDraftPhoto(bytes: Uint8Array, ext: PhotoExt, contentType: string, db: Db = getAdminClient()): Promise<string> {
  const path = `drafts/${randomUUID()}.${ext}`;
  const { error } = await db.storage.from(PHOTO_BUCKET).upload(path, bytes, { contentType, upsert: false, cacheControl: '3600' });
  if (error) throw new RepositoryError(`upload the photo: ${error.message}`, error);
  return path;
}

/** Whether a photo is still kept at `path` (false for anything that is not a photo path). */
export async function photoExists(path: string, db: Db = getAdminClient()): Promise<boolean> {
  if (!PATH.test(path)) return false;
  const { data, error } = await db.storage.from(PHOTO_BUCKET).exists(path);
  if (error) throw new RepositoryError(`check the photo: ${error.message}`, error);
  return data;
}

/** A link to the photo that works for `seconds`. */
export async function signedPhotoUrl(path: string, seconds: number, db: Db = getAdminClient()): Promise<string> {
  if (!PATH.test(path)) throw new RepositoryError(`not a photo path: ${path}`);
  const { data, error } = await db.storage.from(PHOTO_BUCKET).createSignedUrl(path, Math.max(1, Math.round(seconds)));
  if (error || !data) throw new RepositoryError(`sign the photo link: ${error?.message ?? 'no link'}`, error);
  return data.signedUrl;
}

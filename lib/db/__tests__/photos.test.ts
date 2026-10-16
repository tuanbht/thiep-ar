/* Photos in the private bucket: runs against Supabase when SUPABASE_URL and SUPABASE_SECRET_KEY are set. */
import { afterAll, describe, expect, it } from 'vitest';
import { createAdminClient } from '../client';
import { PHOTO_BUCKET, signedPhotoUrl, uploadDraftPhoto } from '../photos';
import { RepositoryError } from '../repository';

const configured = !!process.env.SUPABASE_URL && !!process.env.SUPABASE_SECRET_KEY;
// the smallest PNG: one transparent pixel
const PNG = Uint8Array.from(Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=', 'base64'));

describe('signedPhotoUrl', () => {
  it('refuses anything but a draft photo path', async () => {
    await expect(signedPhotoUrl('../secret.png', 60, null!)).rejects.toBeInstanceOf(RepositoryError);
    await expect(signedPhotoUrl('drafts/x.gif', 60, null!)).rejects.toBeInstanceOf(RepositoryError);
  });
});

describe.skipIf(!configured)('photos in Supabase Storage', () => {
  const db = configured ? createAdminClient() : null!;
  const made: string[] = [];
  afterAll(async () => { if (made.length) await db.storage.from(PHOTO_BUCKET).remove(made); });

  it('uploads a draft photo and hands out a link that serves it', async () => {
    const path = await uploadDraftPhoto(PNG, 'png', 'image/png', db);
    made.push(path);
    expect(path).toMatch(/^drafts\/[0-9a-f-]{36}\.png$/);
    const url = await signedPhotoUrl(path, 60, db);
    const res = await fetch(url);
    expect(res.status).toBe(200);
    expect(new Uint8Array(await res.arrayBuffer())).toEqual(PNG);
  });

  it('keeps the bucket private: the plain public link does not serve it', async () => {
    const path = await uploadDraftPhoto(PNG, 'png', 'image/png', db);
    made.push(path);
    const res = await fetch(`${process.env.SUPABASE_URL}/storage/v1/object/public/${PHOTO_BUCKET}/${path}`);
    expect(res.ok).toBe(false);
  });

  it('refuses a file the bucket does not take', async () => {
    await expect(uploadDraftPhoto(new TextEncoder().encode('<svg/>'), 'png', 'image/svg+xml', db)).rejects.toBeInstanceOf(RepositoryError);
  });
});

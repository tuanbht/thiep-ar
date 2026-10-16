import sharp from 'sharp';
import { describe, expect, it } from 'vitest';
import { cleanPhoto } from '../photo-clean';

/** A real photo with metadata a recipient should never see: GPS position, camera, comment. */
async function photoWithMetadata(format: 'jpeg' | 'png' | 'webp', width = 64, height = 48): Promise<Uint8Array> {
  const img = sharp({ create: { width, height, channels: 3, background: { r: 200, g: 80, b: 90 } } })
    .withExif({ IFD0: { Make: 'PhoneCo', Model: 'Secret 9', ImageDescription: 'home address' }, IFD3: { GPSLatitudeRef: 'N', GPSLatitude: '10/1 46/1 30/1' } });
  return new Uint8Array(await img.toFormat(format).toBuffer());
}

describe('cleanPhoto', () => {
  it.each(['jpeg', 'png', 'webp'] as const)('writes a %s again without its metadata, keeping its kind', async format => {
    const ext = format === 'jpeg' ? 'jpg' : format;
    const before = await photoWithMetadata(format);
    expect((await sharp(before).metadata()).exif).toBeDefined();
    const after = await cleanPhoto(before, ext);
    const meta = await sharp(after.bytes).metadata();
    expect(after.ext).toBe(ext);
    expect(meta.format).toBe(format);
    expect(meta.exif).toBeUndefined();
    expect(Buffer.from(after.bytes).includes(Buffer.from('home address'))).toBe(false);
  });

  it('cuts a huge photo down to 2400 px on its longest side', async () => {
    const big = await photoWithMetadata('jpeg', 3600, 1800);
    const meta = await sharp((await cleanPhoto(big, 'jpg')).bytes).metadata();
    expect([meta.width, meta.height]).toEqual([2400, 1200]);
  });

  it('refuses bytes that only look like an image', async () => {
    const fake = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, ...new TextEncoder().encode('<script>alert(1)</script>')]);
    await expect(cleanPhoto(fake, 'jpg')).rejects.toThrow();
  });
});

/* Every photo a buyer uploads is decoded and written again before it is kept: the location, camera and other metadata
   in it are dropped (a recipient should not learn where it was taken), it is turned upright, cut down to a size a
   phone shows well, and anything that only looked like an image is refused. */
import "server-only";
import sharp from "sharp";
import type { PhotoExt } from "../orders/photo";

/** the longest side a gift photo keeps, in pixels */
const LONGEST_SIDE = 2400;
/** pictures bigger than this are refused before they are decoded (a small file can claim a huge size) */
const MAX_INPUT_PIXELS = 40_000_000;

export async function cleanPhoto(
  bytes: Uint8Array,
  ext: PhotoExt,
): Promise<{ bytes: Uint8Array; ext: PhotoExt }> {
  const img = sharp(bytes, {
    limitInputPixels: MAX_INPUT_PIXELS,
    failOn: "error",
  })
    .rotate()
    .resize({
      width: LONGEST_SIDE,
      height: LONGEST_SIDE,
      fit: "inside",
      withoutEnlargement: true,
    });
  const out =
    ext === "png"
      ? await img.png({ compressionLevel: 9 }).toBuffer()
      : ext === "webp"
        ? await img.webp({ quality: 85 }).toBuffer()
        : await img.jpeg({ quality: 85, mozjpeg: true }).toBuffer();
  return { bytes: new Uint8Array(out), ext };
}

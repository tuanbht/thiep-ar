/* POST /api/uploads: a photo for the card (multipart, field "photo"), checked by its own bytes (JPEG, PNG or WebP, at
   most 5 MB) and kept privately; answers its path (for the order) and a short-lived link (for the preview). */
import type { NextRequest } from 'next/server';
import { LIMITS } from '@/lib/api/dto';
import { InvalidInput } from '@/lib/orders/errors';
import { json, readBody, route } from '@/lib/server/api';
import { getServices } from '@/lib/server/services';

/** the photo plus the multipart framing around it */
const MAX_BODY = LIMITS.photoBytes + 64 * 1024;

export async function POST(req: NextRequest) {
  return route(req, { rate: { name: 'uploads', limit: 10, windowMs: 60_000 }, sameOrigin: true }, async () => {
    const type = req.headers.get('content-type') ?? '';
    if (!type.startsWith('multipart/form-data')) throw new InvalidInput(['Hãy gửi ảnh dưới dạng tệp.']);
    const body = await readBody(req, MAX_BODY);
    let form: FormData;
    try { form = await new Response(body, { headers: { 'content-type': type } }).formData(); }
    catch { throw new InvalidInput(['Không đọc được tệp gửi lên.']); }
    const photo = form.get('photo');
    if (!(photo instanceof Blob)) throw new InvalidInput(['Chưa có ảnh nào được gửi.']);
    return json(await getServices().orders.uploadPhoto(new Uint8Array(await photo.arrayBuffer())), 201);
  });
}

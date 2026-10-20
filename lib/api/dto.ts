/* What the browser and the API routes send each other. Requests are parsed with these schemas on the server (never
   trusted); responses are typed the same on both sides.
     POST /api/orders                   CreateOrderRequest  -> 201 CreateOrderResponse (+ the order's access cookie)
     GET  /api/orders/:id               (cookie)            -> 200 OrderView
     POST /api/orders/:id/pay           (cookie)            -> 200 PayResponse
     POST /api/uploads                  multipart "photo"   -> 201 UploadResponse
     POST /api/events                   EventRequest        -> 204
   Errors: { error: string } with 400 (bad input), 403 (no access), 404, 409 (wrong state), 413, 429, 503. */
import { z } from 'zod';
import { CLIENT_EVENT_NAMES, type OrderStatus } from '../domain/types';

export const LIMITS = {
  title: 80,
  intro: 300,
  to: 80,
  from: 120,
  paragraph: 1200,
  paragraphs: 12,
  name: 80,
  email: 254,
  phone: 20,
  photoBytes: 5 * 1024 * 1024
} as const;

const trimmed = (max: number) => z.string().trim().max(max);

/** where POST /api/uploads keeps a photo while the card is being written */
export const PHOTO_PATH = /^drafts\/[0-9a-f-]{36}\.(jpg|png|webp)$/;

export const giftContentInputSchema = z.object({
  title: trimmed(LIMITS.title).min(1),
  intro: trimmed(LIMITS.intro).default(''),
  letter: z.object({
    to: trimmed(LIMITS.to).min(1),
    body: z.array(trimmed(LIMITS.paragraph)).max(LIMITS.paragraphs).transform(ps => ps.filter(Boolean)),
    from: trimmed(LIMITS.from).min(1)
  }),
  /** slot name -> words; checked against the product's form on the server (unknown slots refused, lengths capped) */
  slots: z.record(z.string(), z.string()).default({}),
  /** a path returned by POST /api/uploads, or null */
  photoPath: z.string().regex(PHOTO_PATH).nullable().default(null)
});
export type GiftContentInput = z.input<typeof giftContentInputSchema>;

export const buyerSchema = z.object({
  name: trimmed(LIMITS.name).optional().transform(v => v || null),
  email: z.string().trim().max(LIMITS.email).email().optional().or(z.literal('')).transform(v => v || null),
  phone: z.string().trim().max(LIMITS.phone).regex(/^[0-9+ ()-]*$/).optional().transform(v => v || null)
});

export const createOrderRequestSchema = z.object({
  productId: z.string().regex(/^[a-z0-9][a-z0-9_-]*$/i),
  content: giftContentInputSchema,
  buyer: buyerSchema.prefault({})
});
export type CreateOrderRequest = z.input<typeof createOrderRequestSchema>;

export interface CreateOrderResponse {
  orderId: string;
  code: string;
  /** where to go next: the checkout page */
  checkoutUrl: string;
}

export interface OrderView {
  id: string;
  code: string;
  status: OrderStatus;
  amountVnd: number;
  product: { id: string; name: string; template: string };
  createdAt: string;
  paidAt: string | null;
  /** the gift's link, once the order is paid */
  giftUrl: string | null;
}

/** A bank transfer to make by scanning a VietQR code (SePay): the page shows it and waits for the money. */
export interface PaymentQr {
  /** the VietQR image to scan with a banking app */
  imageUrl: string;
  bankName: string;
  accountNumber: string;
  accountName: string;
  amountVnd: number;
  /** the transfer's message: the order's payment code, which is how the payment is matched to the order */
  content: string;
}

export type PayResponse =
  /** where to send the buyer: the order page (paid at once) or a payment gateway */
  | { redirect: string }
  /** pay by transfer: show the QR code, then poll GET /api/orders/:id until it is paid */
  | { qr: PaymentQr };

export interface UploadResponse {
  photoPath: string;
  /** a short-lived link to show the photo in the preview */
  previewUrl: string;
}

export const eventRequestSchema = z.object({
  name: z.enum(CLIENT_EVENT_NAMES),
  sessionId: z.string().regex(/^[A-Za-z0-9_-]{8,64}$/).optional(),
  giftSlug: z.string().max(32).optional(),
  productId: z.string().regex(/^[a-z0-9][a-z0-9_-]{0,63}$/i).optional(),
  props: z.record(z.string().max(40), z.union([z.string().max(200), z.number(), z.boolean(), z.null()])).optional()
    .refine(p => !p || Object.keys(p).length <= 20, 'at most 20 props')
});
export type EventRequest = z.input<typeof eventRequestSchema>;

export interface ApiError { error: string }

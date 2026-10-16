/* The buyer's key to an order: a random token in an httpOnly cookie, one per order. Only its sha256 is stored with the
   order, so a database leak does not open anyone's order. */
import 'server-only';
import { cookies } from 'next/headers';

const DAYS_30 = 60 * 60 * 24 * 30;

export const orderCookieName = (orderId: string): string => `gc_o_${orderId}`;

export const orderCookieOptions = () => ({
  httpOnly: true,
  sameSite: 'lax' as const,
  path: '/',
  secure: process.env.NODE_ENV === 'production',
  maxAge: DAYS_30
});

/** The token for an order from this request's cookies (pages and server functions). */
export async function readOrderToken(orderId: string): Promise<string | null> {
  return (await cookies()).get(orderCookieName(orderId))?.value ?? null;
}

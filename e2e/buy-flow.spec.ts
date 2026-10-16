/* The whole MVP workflow in a real browser: a buyer writes a flower-letter card, buys it, pays (test provider), gets the
   gift link; the recipient opens it on a phone whose camera films the printed card, plays every stop and reads the
   letter. Then the database is checked: the order paid, the gift active, the events counted. Needs `pnpm db:start`. */
import { readFileSync } from 'node:fs';
import { parseEnv } from 'node:util';
import { createClient } from '@supabase/supabase-js';
import { expect, test, type Page } from '@playwright/test';

const env = parseEnv(readFileSync('.env.local', 'utf8'));
const db = createClient(env.SUPABASE_URL!, env.SUPABASE_SECRET_KEY!, { auth: { persistSession: false } });

const state = (page: Page) => page.evaluate(() => (window as unknown as { __state?: string }).__state ?? '');
const until = (page: Page, want: RegExp) => expect.poll(() => state(page), { timeout: 90_000 }).toMatch(want);
const visible = (page: Page, name: string) => page.getByRole('button', { name }).filter({ visible: true }).first();
const origin = () => new URL(test.info().project.use.baseURL!).origin;

test('a buyer writes a card, pays, and the recipient opens it with the camera', async ({ page, browser }) => {
  const mark = `e2e-${Date.now().toString(36)}`;

  // the shop: pick the flower letter
  await page.goto('/');
  await page.locator('a[href="/cards/flower-letter"]').first().click();
  await expect(page).toHaveURL(/\/cards\/flower-letter$/);

  // the live preview plays the act beside the form (on a phone it opens on request)
  await page.waitForLoadState('networkidle');                          // the form streams in after the page's shell
  const opener = page.getByRole('button', { name: /xem trước/i }).filter({ visible: true }).first();
  const preview = page.locator('[data-preview-state]').filter({ visible: true }).first();
  if (await opener.count()) await expect(async () => {                 // a click before the page hydrates does nothing: try again
    if ((await opener.getAttribute('aria-expanded')) !== 'true') await opener.click();
    await expect(preview).toBeAttached({ timeout: 2_000 });
  }).toPass({ timeout: 30_000 });
  await expect(preview).toHaveAttribute('data-preview-state', /^(playing|paused):\d+$/, { timeout: 90_000 });

  // write it
  await page.getByLabel('Tiêu đề').fill(`Gửi Hanna ${mark}`);
  await page.getByLabel('Note', { exact: true }).fill("Happy Women's Day Hanna");
  await page.getByLabel('Lời mở thư').fill('Hanna à,');
  await page.getByLabel('Lời ký tên').fill(`Yêu em. ${mark}`);

  // buy and pay
  await visible(page, 'Mua thiệp').click();
  await page.waitForURL(/\/checkout\/[0-9a-f-]{36}$/);
  const orderId = page.url().split('/').pop()!;
  await visible(page, 'Thanh toán').click();
  await page.waitForURL(new RegExp(`/orders/${orderId}$`));
  const giftUrl = (await page.getByTestId('gift-url').textContent())!.trim();
  const giftPath = new URL(giftUrl).pathname;                    // the link names the configured site; open it on the server under test
  expect(giftPath).toMatch(/^\/g\/[A-Za-z0-9]{10}$/);

  // the order is the buyer's alone: another browser is turned away
  const stranger = await browser.newContext();
  const other = await stranger.newPage();
  await other.goto(`/orders/${orderId}`);
  await expect(other.getByText('Đơn này được đặt trên trình duyệt khác')).toBeVisible();
  await stranger.close();

  // the recipient: a phone filming the printed card
  const phone = await browser.newContext({ permissions: ['camera'] });
  const gift = await phone.newPage();
  const errors: string[] = [];
  gift.on('pageerror', e => errors.push(String(e)));
  await gift.goto(giftPath);
  await gift.locator('#start:not([disabled])').click();
  await until(gift, /^paused:0$/);
  const up = await gift.evaluate(() => (window as unknown as { __stage?: { actUp(): number[] | null } }).__stage?.actUp());
  expect(up?.[1]).toBeGreaterThan(0.9);                          // the act stands upright on the screen: it faces the phone
  await gift.mouse.click(200, 600);
  await until(gift, /^paused:1$/);
  await gift.mouse.click(200, 600);
  await until(gift, /^reading$/);
  await expect(gift.locator('#letter-read')).toContainText(`Yêu em. ${mark}`);
  await gift.screenshot({ path: test.info().outputPath('gift-letter.png') });
  expect(errors).toEqual([]);
  await phone.close();

  // the database: paid, active, counted
  const { data: order } = await db.from('orders').select('status, amount_vnd, paid_at, gift_card_id').eq('id', orderId).single();
  expect(order).toMatchObject({ status: 'paid', amount_vnd: 49000 });
  const { data: card } = await db.from('gift_cards').select('status, slug, content').eq('id', order!.gift_card_id).single();
  expect(card).toMatchObject({ status: 'active', slug: giftPath.split('/').pop() });
  expect((card!.content as { letter: { from: string } }).letter.from).toBe(`Yêu em. ${mark}`);
  const counted = ['order_created', 'payment_started', 'order_paid', 'gift_open', 'ar_start', 'card_found', 'letter_open'];
  await expect.poll(async () => {                               // the player posts its events as they happen: give the last a moment
    const { data } = await db.from('events').select('name').or(`order_id.eq.${orderId},gift_card_id.eq.${order!.gift_card_id}`);
    const names = new Set((data ?? []).map(e => e.name));
    return counted.filter(n => !names.has(n));
  }, { timeout: 15_000 }).toEqual([]);
});

test('an unpaid gift cannot be opened', async ({ page, request }) => {
  const res = await request.post('/api/orders', {
    headers: { Origin: origin() },
    data: { productId: 'mochi', content: { title: 'Chưa trả tiền', letter: { to: 'Bạn ơi,', body: ['Thử thôi.'], from: 'Tớ' } } }
  });
  expect(res.status()).toBe(201);
  const { orderId } = await res.json();
  const { data: order } = await db.from('orders').select('gift_card_id, status').eq('id', orderId).single();
  expect(order!.status).toBe('pending');
  const { data: card } = await db.from('gift_cards').select('slug, status').eq('id', order!.gift_card_id).single();
  expect(card!.status).toBe('draft');
  // the page streams, so it keeps its 200 (Next adds noindex); what matters is that none of the card reaches the browser
  const html = await (await request.get(`/g/${card!.slug}`)).text();
  expect(html).not.toContain('Chưa trả tiền');
  expect(html).not.toContain('Thử thôi.');
  await page.goto(`/g/${card!.slug}`);
  await expect(page.getByRole('heading', { name: 'Không tìm thấy tấm thiệp' })).toBeVisible();
  await expect(page.locator('#start')).toHaveCount(0);
});

test('orders are refused from another site', async ({ request }) => {
  const res = await request.post('/api/orders', {
    headers: { Origin: 'https://evil.example' },
    data: { productId: 'mochi', content: { title: 'x', letter: { to: 'x', body: [], from: 'x' } } }
  });
  expect(res.status()).toBe(403);
});

// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { CONTACT } from '@/lib/contact';

const zaloQrSrc = vi.fn<() => string | null>();
vi.mock('@/lib/contact-server', () => ({ zaloQrSrc: () => zaloQrSrc() }));
// eslint-disable-next-line @next/next/no-img-element -- a stand-in for next/image in jsdom
vi.mock('next/image', () => ({ default: (p: { src: string; alt: string }) => <img src={p.src} alt={p.alt} /> }));
const { default: AboutPage } = await import('../page');

afterEach(cleanup);

describe('the About page', () => {
  it('gives the email to write to, and the Zalo QR code once it is saved', () => {
    zaloQrSrc.mockReturnValue('/contact/zalo-qr.png');
    render(<AboutPage />);
    expect(screen.getByRole('link', { name: CONTACT.email }).getAttribute('href')).toBe(`mailto:${CONTACT.email}`);
    expect(screen.getByRole('img', { name: 'Mã QR Zalo của Bưu cục Đêm' }).getAttribute('src')).toBe('/contact/zalo-qr.png');
    expect(document.getElementById('lien-he')).not.toBeNull();
  });

  it('shows only the email while there is no QR code', () => {
    zaloQrSrc.mockReturnValue(null);
    render(<AboutPage />);
    expect(screen.queryByRole('img', { name: /Zalo/ })).toBeNull();
    expect(screen.getByRole('link', { name: CONTACT.email })).toBeTruthy();
  });
});

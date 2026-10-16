// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { ContactNote } from '../ContactNote';

afterEach(cleanup);

describe('ContactNote', () => {
  it('ends an order with where to get help, quoting its code', () => {
    render(<ContactNote code="GC-261016-7K3QX" />);
    expect(screen.getByRole('heading', { name: 'Cần hỗ trợ?' })).toBeTruthy();
    expect(screen.getByText('GC-261016-7K3QX')).toBeTruthy();
    expect(screen.getByRole('link', { name: /Liên hệ chúng tôi/ }).getAttribute('href')).toBe('/about#lien-he');
  });

  it('reads well without a code', () => {
    const { container } = render(<ContactNote />);
    expect(container.textContent).toContain('gửi kèm mã đơn.');
  });
});

// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { mergeCard } from '@/lib/player/core/card';
import { Hint, ReadView } from '../ui';

const card = mergeCard({ template: 'mochi', title: 'Gửi Hanna', letter: { to: 'Hanna à,', body: ['Một dòng.'], from: 'Yêu em.' } });

afterEach(cleanup);

describe('Hint', () => {
  it('keeps its live region mounted while there is nothing to say, so the next hint is announced', () => {
    const { container, rerender } = render(<Hint text={null} />);
    const live = container.querySelector('[aria-live="polite"]');
    expect(live).not.toBeNull();
    expect(live!.textContent).toBe('');
    rerender(<Hint text="Đang tìm tấm thiệp" />);
    expect(container.querySelector('[aria-live="polite"]')).toBe(live);
    expect(live!.textContent).toBe('Đang tìm tấm thiệp');
  });

  it('is plain words while the act plays and a button while it waits at a stop', () => {
    const onActivate = vi.fn();
    const { rerender } = render(<Hint text="Đang tìm tấm thiệp" />);
    expect(screen.queryByRole('button')).toBeNull();
    rerender(<Hint text="Chạm để xem ảnh" onActivate={onActivate} />);
    const button = screen.getByRole('button', { name: 'Chạm để xem ảnh' });
    fireEvent.click(button);
    expect(onActivate).toHaveBeenCalledTimes(1);
    expect(button.hasAttribute('data-ui')).toBe(true);           // the act's own tap listener leaves it alone: no double step
  });

  it('takes the focus when the last stop was passed with the keys', () => {
    render(<Hint text="Chạm để đọc thư" onActivate={() => {}} autoFocus />);
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Chạm để đọc thư' }));
  });
});

describe('ReadView', () => {
  it('opens as a dialog with the focus on the letter', () => {
    render(<ReadView card={card} onClose={() => {}} />);
    expect(screen.getByRole('dialog')).toBeTruthy();
    expect(document.activeElement?.id).toBe('letter-read');
  });

  it('closes on Escape and with its button', () => {
    const onClose = vi.fn();
    render(<ReadView card={card} onClose={onClose} />);
    act(() => { window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' })); });
    expect(onClose).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole('button'));
    expect(onClose).toHaveBeenCalledTimes(2);
  });

  it('stops listening for Escape once it is closed', () => {
    const onClose = vi.fn();
    const { unmount } = render(<ReadView card={card} onClose={onClose} />);
    unmount();
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    expect(onClose).not.toHaveBeenCalled();
  });
});

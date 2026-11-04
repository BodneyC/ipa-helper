import { act, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { LONG_PRESS_MS, SymbolKey } from './SymbolKey';
import { symbolById } from '../../../domain/inventory';
import { symbolId } from '../../../domain/inventory/symbol-id';
import type { PhoneSymbol } from '../../../domain/inventory/types';
import { labelsOf } from '../../../domain/serialise/labels';

const get = (id: string): PhoneSymbol => {
  const symbol = symbolById(symbolId(id));
  if (symbol === undefined) throw new Error(id);
  return symbol;
};

const esh = get('esh');

const renderKey = (symbol: PhoneSymbol = esh) => {
  const onActivate = vi.fn<(s: PhoneSymbol) => void>();
  render(<SymbolKey symbol={symbol} labels={labelsOf(symbol, 'narrow')} onActivate={onActivate} />);
  return { onActivate, key: screen.getByRole('button') };
};

afterEach(() => {
  vi.useRealTimers();
});

describe('<SymbolKey>', () => {
  it('SPEC §6: pulses on each activation, restarting the pulse each time', async () => {
    const user = userEvent.setup();
    const { key } = renderKey();
    expect(key.querySelector('[aria-hidden="true"]')).toBeNull();
    await user.click(key);
    const first = key.lastElementChild;
    expect(first).toHaveAttribute('aria-hidden', 'true');
    await user.click(key);
    expect(key.lastElementChild).not.toBe(first);
    expect(key).toHaveAccessibleName(/^ʃ\s?, voiceless postalveolar fricative, as in\s?ship$/);
  });

  it('FR-2: is a button named by glyph, name and example, described by its TIPA', () => {
    const { key } = renderKey();
    // Engines differ on whitespace around the visually hidden span; the order is what matters.
    expect(key).toHaveAccessibleName(/^ʃ\s?, voiceless postalveolar fricative, as in\s?ship$/);
    expect(key).toHaveAccessibleDescription('TIPA S');
    expect(key).toHaveTextContent('ʃ, voiceless postalveolar fricative, as in ship');
  });

  it('FR-2: names a suprasegmental by its meaning and labels it with its name', () => {
    const { key } = renderKey(get('primary-stress'));
    expect(key).toHaveAccessibleName(/^ˈ\s?,\s?primary stress$/);
    expect(key).toHaveTextContent('ˈ, primary stress');
  });

  it('FR-10: activates on click, Enter and Space', async () => {
    const user = userEvent.setup();
    const { key, onActivate } = renderKey();
    await user.click(key);
    key.focus();
    await user.keyboard('{Enter}');
    await user.keyboard(' ');
    expect(onActivate).toHaveBeenCalledTimes(3);
    expect(onActivate).toHaveBeenCalledWith(esh);
  });

  it('FR-2: shows the tooltip on focus, with the example highlighted', () => {
    const { key } = renderKey();
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
    act(() => {
      key.focus();
    });
    const tooltip = screen.getByRole('tooltip');
    expect(tooltip).toHaveTextContent('voiceless postalveolar fricative');
    expect(tooltip).toHaveTextContent('ship');
    expect(tooltip.querySelector('strong')).toHaveTextContent(/^sh$/);
    expect(tooltip).toHaveTextContent('TIPA S');
  });

  it('WCAG 1.4.13: Escape dismisses the tooltip without leaving the key', async () => {
    const user = userEvent.setup();
    const { key } = renderKey();
    act(() => {
      key.focus();
    });
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
    expect(key).toHaveFocus();
    act(() => {
      key.blur();
    });
    act(() => {
      key.focus();
    });
    expect(screen.getByRole('tooltip')).toBeVisible();
  });

  it('lets Escape through when no tooltip is open', () => {
    const { key } = renderKey();
    const outer = vi.fn();
    document.addEventListener('keydown', outer);
    fireEvent.keyDown(key, { key: 'Escape' });
    fireEvent.keyDown(key, { key: 'a' });
    document.removeEventListener('keydown', outer);
    expect(outer).toHaveBeenCalledTimes(2);
  });

  it('WCAG 1.4.13: stays open while the pointer moves onto the tooltip', () => {
    vi.useFakeTimers();
    const { key } = renderKey();
    fireEvent.pointerEnter(key, { pointerType: 'mouse' });
    const tooltip = screen.getByRole('tooltip');
    fireEvent.pointerLeave(key);
    fireEvent.pointerEnter(tooltip);
    act(() => {
      vi.advanceTimersByTime(500);
    });
    expect(screen.getByRole('tooltip')).toBeVisible();
    fireEvent.pointerLeave(tooltip);
    act(() => {
      vi.advanceTimersByTime(500);
    });
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
  });

  it('closes the tooltip when the page scrolls', () => {
    const { key } = renderKey();
    fireEvent.pointerEnter(key, { pointerType: 'mouse' });
    expect(screen.getByRole('tooltip')).toBeVisible();
    fireEvent.scroll(window);
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
  });

  it('ignores touch pointers entering, so a tap does not leave a tooltip open', () => {
    const { key } = renderKey();
    fireEvent.pointerEnter(key, { pointerType: 'touch' });
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
  });

  it('FR-2: a touch long-press shows the tooltip and does not add the symbol', () => {
    vi.useFakeTimers();
    const { key, onActivate } = renderKey();
    fireEvent.pointerDown(key, { pointerType: 'touch' });
    act(() => {
      vi.advanceTimersByTime(LONG_PRESS_MS);
    });
    expect(screen.getByRole('tooltip')).toBeVisible();
    const menu = fireEvent.contextMenu(key);
    expect(menu).toBe(false); // default prevented
    fireEvent.pointerUp(key, { pointerType: 'touch' });
    fireEvent.click(key);
    expect(onActivate).not.toHaveBeenCalled();
    // The next touch anywhere closes it.
    fireEvent.pointerDown(document.body, { pointerType: 'touch' });
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
    fireEvent.click(key);
    expect(onActivate).toHaveBeenCalledTimes(1);
  });

  it('treats a short tap as a normal activation', () => {
    vi.useFakeTimers();
    const { key, onActivate } = renderKey();
    fireEvent.pointerDown(key, { pointerType: 'touch' });
    act(() => {
      vi.advanceTimersByTime(LONG_PRESS_MS - 100);
    });
    fireEvent.pointerUp(key, { pointerType: 'touch' });
    fireEvent.click(key);
    expect(onActivate).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
  });

  it('leaves the context menu alone for mouse users', () => {
    const { key } = renderKey();
    fireEvent.pointerDown(key, { pointerType: 'mouse' });
    expect(fireEvent.contextMenu(key)).toBe(true);
  });
});

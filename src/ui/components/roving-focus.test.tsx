import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';

import { ROVING_ITEM, useRovingFocus } from './roving-focus';

/** Keys laid out in rows: [a b c] / [d e] / [f], each 50 px apart. */
const LAYOUT: Readonly<Record<string, { x: number; y: number }>> = {
  a: { x: 0, y: 0 },
  b: { x: 50, y: 2 },
  c: { x: 100, y: 0 },
  d: { x: 90, y: 50 },
  e: { x: 140, y: 50 },
  f: { x: 0, y: 100 },
};

function Group({ names }: { readonly names: readonly string[] }) {
  return (
    <div ref={useRovingFocus<HTMLDivElement>()}>
      {names.map((name) => (
        <button key={name} type="button" {...{ [ROVING_ITEM]: '' }}>
          {name}
        </button>
      ))}
      <button type="button">not an item</button>
    </div>
  );
}

function Fixture() {
  const [names, setNames] = useState(['a', 'b', 'c', 'd', 'e', 'f']);
  return (
    <>
      <button type="button">before</button>
      <Group names={names} />
      <button
        type="button"
        onClick={() => {
          setNames(['a', 'b']);
        }}
      >
        shrink
      </button>
    </>
  );
}

const setup = () => {
  vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function (
    this: HTMLElement,
  ) {
    const at = LAYOUT[this.textContent] ?? { x: 0, y: 0 };
    return DOMRect.fromRect({ x: at.x, y: at.y, width: 40, height: 40 });
  });
  render(<Fixture />);
  return userEvent.setup();
};

const key = (name: string) => screen.getByRole('button', { name });

describe('useRovingFocus (FR-50)', () => {
  it('puts only the first item in the Tab order at first', async () => {
    const user = setup();
    expect(key('a')).toHaveAttribute('tabindex', '0');
    expect(key('b')).toHaveAttribute('tabindex', '-1');
    await user.click(key('before'));
    await user.tab();
    expect(key('a')).toHaveFocus();
    await user.tab();
    expect(key('not an item')).toHaveFocus();
  });

  it('moves with ← → Home End in DOM order, and stops at the ends', async () => {
    const user = setup();
    key('a').focus();
    await user.keyboard('{ArrowRight}{ArrowRight}');
    expect(key('c')).toHaveFocus();
    await user.keyboard('{End}');
    expect(key('f')).toHaveFocus();
    await user.keyboard('{ArrowRight}');
    expect(key('f')).toHaveFocus();
    await user.keyboard('{Home}{ArrowLeft}');
    expect(key('a')).toHaveFocus();
  });

  it('moves with ↑ ↓ to the nearest key in the next row', async () => {
    const user = setup();
    key('c').focus();
    await user.keyboard('{ArrowDown}');
    expect(key('d')).toHaveFocus();
    await user.keyboard('{ArrowDown}');
    expect(key('f')).toHaveFocus();
    await user.keyboard('{ArrowDown}');
    expect(key('f')).toHaveFocus();
    await user.keyboard('{ArrowUp}');
    expect(key('d')).toHaveFocus();
    await user.keyboard('{ArrowUp}');
    expect(key('c')).toHaveFocus();
  });

  it('remembers the last focused item as the Tab stop', async () => {
    const user = setup();
    key('a').focus();
    await user.keyboard('{ArrowRight}');
    expect(key('b')).toHaveAttribute('tabindex', '0');
    expect(key('a')).toHaveAttribute('tabindex', '-1');
    await user.click(key('before'));
    await user.tab();
    expect(key('b')).toHaveFocus();
  });

  it('claims navigation keys even at the edges, but not other keys or modified ones', () => {
    setup();
    const seen: boolean[] = [];
    const record = (event: KeyboardEvent) => {
      seen.push(event.defaultPrevented);
    };
    document.addEventListener('keydown', record);
    const press = (init: KeyboardEventInit, on = key('a')) =>
      on.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, cancelable: true, ...init }));
    press({ key: 'ArrowLeft' });
    press({ key: 'ArrowUp' });
    press({ key: 'Backspace' });
    press({ key: 'ArrowLeft', shiftKey: true });
    press({ key: 'ArrowLeft' }, key('not an item'));
    document.removeEventListener('keydown', record);
    expect(seen).toEqual([true, true, false, false, false]);
  });

  it('falls back to the first item when the remembered one goes away', async () => {
    const user = setup();
    key('e').focus();
    await user.click(key('shrink'));
    expect(key('a')).toHaveAttribute('tabindex', '0');
  });
});

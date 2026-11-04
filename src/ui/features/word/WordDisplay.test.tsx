import { act, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { WordActions } from './WordActions';
import { WordDisplay } from './WordDisplay';
import { Providers } from '../../../app/providers';
import { symbolId } from '../../../domain/inventory/symbol-id';
import { wordFromIds } from '../../../domain/word/word';
import { DEFAULT_SETTINGS } from '../../../state/settings';

const ids = (...raw: string[]) => wordFromIds(raw.map(symbolId));
const thornic = ids('primary-stress', 'theta', 'open-o-long', 'n', 'small-cap-i', 'k');

const renderWord = (word = thornic, rDisplay: 'narrow' | 'broad' = 'narrow') => {
  render(
    <Providers initialWord={word} initialSettings={{ ...DEFAULT_SETTINGS, rDisplay }}>
      <WordDisplay />
      <WordActions />
    </Providers>,
  );
  const box = screen.getByRole('textbox', { name: 'Word' });
  return { box, user: userEvent.setup() };
};

/** The text either side of the caret, e.g. "ˈθɔː|nɪk". */
const withCaret = (box: HTMLElement) =>
  [...box.childNodes]
    .map((n) =>
      n instanceof HTMLElement && n.getAttribute('aria-hidden') === 'true' && n.textContent === ''
        ? '|'
        : n.textContent,
    )
    .join('');

describe('<WordDisplay>', () => {
  it('FR-11: shows the word between slashes, and /…/ when empty', () => {
    const { box } = renderWord();
    expect(box).toHaveTextContent('/ˈθɔːnɪk/');
    expect(box).toHaveAccessibleDescription(/Backspace/);
  });

  it('FR-11: shows a placeholder for the empty word', () => {
    const { box } = renderWord([]);
    expect(box).toHaveTextContent('/…/');
    expect(withCaret(box)).toBe('/|…/');
  });

  it('Q-3: displays the British r according to the setting', () => {
    const { box } = renderWord(ids('turned-r', 'e', 'd'), 'broad');
    expect(box).toHaveTextContent('/red/');
  });

  it('marks a symbol ID the inventory no longer knows', () => {
    const { box } = renderWord(ids('no-such-symbol'));
    expect(box).toHaveTextContent('/?/');
  });

  it('FR-12: arrow keys, Home and End move the cursor', async () => {
    const { box, user } = renderWord();
    expect(withCaret(box)).toBe('/ˈθɔːnɪk|/');
    box.focus();
    await user.keyboard('{ArrowLeft}{ArrowLeft}');
    expect(withCaret(box)).toBe('/ˈθɔːn|ɪk/');
    await user.keyboard('{Home}');
    expect(withCaret(box)).toBe('/|ˈθɔːnɪk/');
    await user.keyboard('{ArrowRight}');
    expect(withCaret(box)).toBe('/ˈ|θɔːnɪk/');
    await user.keyboard('{End}');
    expect(withCaret(box)).toBe('/ˈθɔːnɪk|/');
  });

  it('FR-13: Backspace and Delete remove whole tokens either side of the cursor', async () => {
    const { box, user } = renderWord();
    box.focus();
    await user.keyboard('{ArrowLeft}{ArrowLeft}{Backspace}');
    expect(withCaret(box)).toBe('/ˈθɔː|ɪk/');
    await user.keyboard('{Backspace}');
    expect(withCaret(box)).toBe('/ˈθ|ɪk/'); // ɔː goes in one step
    await user.keyboard('{Delete}');
    expect(withCaret(box)).toBe('/ˈθ|k/');
  });

  it('FR-14: Ctrl+Z undoes, Ctrl+Shift+Z and Ctrl+Y redo, Cmd works too', async () => {
    const { box, user } = renderWord();
    box.focus();
    await user.keyboard('{Backspace}{Backspace}');
    expect(box).toHaveTextContent('/ˈθɔːn/');
    await user.keyboard('{Control>}z{/Control}');
    expect(box).toHaveTextContent('/ˈθɔːnɪ/');
    await user.keyboard('{Meta>}z{/Meta}');
    expect(box).toHaveTextContent('/ˈθɔːnɪk/');
    await user.keyboard('{Control>}{Shift>}z{/Shift}{/Control}');
    expect(box).toHaveTextContent('/ˈθɔːnɪ/');
    await user.keyboard('{Control>}y{/Control}');
    expect(box).toHaveTextContent('/ˈθɔːn/');
  });

  it('lets other keys through untouched', () => {
    const { box } = renderWord();
    for (const init of [
      { key: 'a' },
      { key: 'ArrowLeft', altKey: true },
      { key: 'c', ctrlKey: true },
    ]) {
      expect(fireEvent.keyDown(box, init)).toBe(true); // not prevented
    }
    expect(withCaret(box)).toBe('/ˈθɔːnɪk|/');
  });

  it('FR-12: clicking a token puts the cursor on its nearer side', () => {
    const { box } = renderWord();
    const tokens = box.querySelectorAll<HTMLElement>('[data-index]');
    const theta = tokens[1];
    if (theta === undefined) throw new Error('no token');
    vi.spyOn(theta, 'getBoundingClientRect').mockReturnValue(
      DOMRect.fromRect({ x: 100, width: 20 }),
    );
    fireEvent.click(theta, { clientX: 105 });
    expect(withCaret(box)).toBe('/ˈ|θɔːnɪk/');
    fireEvent.click(theta, { clientX: 115 });
    expect(withCaret(box)).toBe('/ˈθ|ɔːnɪk/');
  });

  it('FR-12: clicking past the tokens puts the cursor at the end', () => {
    const { box } = renderWord();
    act(() => {
      box.focus();
    });
    fireEvent.keyDown(box, { key: 'Home' });
    fireEvent.click(box);
    expect(withCaret(box)).toBe('/ˈθɔːnɪk|/');
  });
});

describe('<WordActions>', () => {
  it('FR-13/FR-14: Clear empties the word, and Undo brings it back', async () => {
    const { box, user } = renderWord();
    const undo = screen.getByRole('button', { name: 'Undo' });
    const redo = screen.getByRole('button', { name: 'Redo' });
    const clear = screen.getByRole('button', { name: 'Clear' });
    expect(undo).toBeDisabled();
    expect(redo).toBeDisabled();
    await user.click(clear);
    expect(box).toHaveTextContent('/…/');
    expect(clear).toBeDisabled();
    await user.click(undo);
    expect(box).toHaveTextContent('/ˈθɔːnɪk/');
    await user.click(redo);
    expect(box).toHaveTextContent('/…/');
  });
});

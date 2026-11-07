import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { OutputPanel } from './OutputPanel';
import { Providers } from '../../../app/providers';
import { symbolId } from '../../../domain/inventory/symbol-id';
import { NULL_FRAGMENTS } from '../../../domain/ports';
import type { Clipboard } from '../../../domain/ports';
import { err, ok } from '../../../domain/result';
import { wordFromIds } from '../../../domain/word/word';
import { DEFAULT_SETTINGS } from '../../../state/settings';
import type { Settings } from '../../../state/settings';
import { AnnouncerProvider } from '../../components/Announcer';

const ids = (...raw: string[]) => wordFromIds(raw.map(symbolId));
const thornic = ids('primary-stress', 'theta', 'open-o-long', 'n', 'small-cap-i', 'k');

const setup = (
  word = thornic,
  settings: Partial<Settings> = {},
  writeText: Clipboard['writeText'] = () => Promise.resolve(ok(undefined)),
) => {
  const clipboard = { writeText: vi.fn(writeText) };
  render(
    <Providers
      initialWord={word}
      initialSettings={{ ...DEFAULT_SETTINGS, ...settings }}
      services={{ clipboard, fragments: NULL_FRAGMENTS }}
    >
      <AnnouncerProvider>
        <OutputPanel />
      </AnnouncerProvider>
    </Providers>,
  );
  return { clipboard, user: userEvent.setup() };
};

const copied = (clipboard: { writeText: { mock: { calls: unknown[][] } } }) =>
  clipboard.writeText.mock.calls.map(([text]) => text);

describe('<OutputPanel>', () => {
  it('FR-20/FR-21: shows the IPA with slashes and the TIPA without', () => {
    setup();
    const [ipa, tipa] = screen.getAllByRole('status').filter((el) => el.tagName === 'OUTPUT');
    expect(ipa).toHaveTextContent('/ˈθɔːnɪk/');
    expect(tipa).toHaveTextContent('"TO:nIk');
    expect(screen.getByText('IPA')).toBeVisible();
    expect(screen.getByText('TIPA')).toBeVisible();
  });

  it('FR-20: copies the IPA with slashes by default, and without when toggled off', async () => {
    const { clipboard, user } = setup();
    await user.click(screen.getByRole('button', { name: 'Copy IPA' }));
    await user.click(screen.getByRole('checkbox', { name: 'Copy with slashes' }));
    await user.click(screen.getByRole('button', { name: /Copy IPA$/ }));
    expect(copied(clipboard)).toEqual(['/ˈθɔːnɪk/', 'ˈθɔːnɪk']);
  });

  it('FR-21: copies the TIPA, and the full macro call with the configured name', async () => {
    const { clipboard, user } = setup(thornic, { macroName: 'phon' });
    await user.click(screen.getByRole('button', { name: 'Copy TIPA' }));
    await user.click(screen.getByRole('button', { name: 'Copy \\phon{…} macro call' }));
    expect(copied(clipboard)).toEqual(['"TO:nIk', '\\phon{"TO:nIk}']);
  });

  it('Q-2: puts slashes inside the macro argument when asked', async () => {
    const { clipboard, user } = setup(thornic, { tipaSlashes: true });
    await user.click(screen.getByRole('button', { name: 'Copy \\ipa{…} macro call' }));
    expect(copied(clipboard)).toEqual(['\\ipa{/"TO:nIk/}']);
  });

  it('FR-22: escapes TIPA shortcuts that would merge, e.g. two primary stresses', () => {
    setup(ids('primary-stress', 'primary-stress', 'ash'));
    expect(screen.getByText('"{}"\\ae{}')).toBeVisible();
  });

  it('FR-23: shows and announces "Copied", then reverts', async () => {
    vi.useFakeTimers();
    const { clipboard } = setup();
    const button = screen.getByRole('button', { name: 'Copy TIPA' });
    await act(async () => {
      button.click();
      await Promise.resolve();
    });
    expect(clipboard.writeText).toHaveBeenCalledOnce();
    expect(button).toHaveTextContent('Copied');
    expect(button).toHaveAccessibleName('Copied, Copy TIPA');
    const live = screen.getAllByRole('status').find((el) => el.tagName === 'DIV');
    expect(live).toHaveTextContent('Copied TIPA');
    act(() => {
      vi.advanceTimersByTime(2000);
    });
    expect(button).toHaveTextContent('Copy');
    vi.useRealTimers();
  });

  it('FR-23: announces a failed copy', async () => {
    const { user } = setup(thornic, {}, () => Promise.resolve(err({ kind: 'clipboard-denied' })));
    await user.click(screen.getByRole('button', { name: 'Copy IPA' }));
    const live = screen.getAllByRole('status').find((el) => el.tagName === 'DIV');
    expect(live).toHaveTextContent("Couldn't copy");
    expect(screen.getByRole('button', { name: 'Copy IPA' })).toHaveTextContent('Copy');
  });

  it('disables copying while the word is empty', () => {
    setup([]);
    for (const button of screen.getAllByRole('button')) expect(button).toBeDisabled();
    expect(screen.getAllByText('—')).toHaveLength(3);
  });

  describe('other formats (FR-25)', () => {
    it('shows the word in X-SAMPA by default, and copies it', async () => {
      const { clipboard, user } = setup();
      // For this word, TIPA and X-SAMPA happen to agree.
      expect(screen.getAllByText('"TO:nIk')).toHaveLength(2);
      await user.click(screen.getByRole('button', { name: 'Copy X-SAMPA' }));
      expect(copied(clipboard)).toEqual(['"TO:nIk']);
      expect(await screen.findByText('Copied X-SAMPA')).toBeInTheDocument();
    });

    it('switches format from the picker', async () => {
      const { user } = setup();
      await user.selectOptions(screen.getByRole('combobox', { name: 'Format' }), 'eSpeak');
      expect(screen.getByText("[[T'O:nIk]]")).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Copy eSpeak' })).toBeEnabled();
      await user.selectOptions(screen.getByRole('combobox', { name: 'Format' }), 'HTML');
      expect(screen.getByText('<span lang="und-fonipa">/ˈθɔːnɪk/</span>')).toBeInTheDocument();
    });

    it("names the symbols a format can't write", () => {
      setup(ids('k', 'y', 'nasal-release', 'k'), { format: 'espeak' });
      expect(screen.getByText('[[kk]]')).toBeInTheDocument();
      expect(screen.getByText(/^eSpeak can’t write/)).toHaveTextContent(
        'eSpeak can’t write y close front rounded vowel, ◌ⁿ nasal release, so they are left out.',
      );
    });

    it('says "it" for one symbol, and nothing when every symbol is written', () => {
      setup(ids('k', 'y'), { format: 'espeak' });
      expect(screen.getByText(/^eSpeak can’t write/)).toHaveTextContent(/so it is left out\.$/);
    });

    it('has no note when the format can write the whole word', () => {
      setup(thornic, { format: 'kirshenbaum' });
      expect(screen.getByText("'TO:nIk")).toBeInTheDocument();
      expect(screen.queryByText(/can’t write/)).not.toBeInTheDocument();
    });
  });
});

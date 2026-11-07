import { act, fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { importSummary, SavedWordsDialog } from './SavedWordsDialog';
import { Providers } from '../../../app/providers';
import { symbolId } from '../../../domain/inventory/symbol-id';
import type { Downloads, KeyValueStore } from '../../../domain/ports';
import { wordFromIds } from '../../../domain/word/word';
import type { Word } from '../../../domain/word/word';
import { useEditor } from '../../../state/hooks';
import { SAVED_WORDS_STORAGE_KEY } from '../../../state/saved-words';
import { AnnouncerProvider } from '../../components/Announcer';

const ids = (...raw: string[]) => wordFromIds(raw.map(symbolId));

/** An in-memory store. `otherTabWrites` stores a value and fires the `storage` listeners. */
const memoryStore = (initial: Record<string, string> = {}) => {
  const data = new Map(Object.entries(initial));
  const listeners = new Set<() => void>();
  const store: KeyValueStore = {
    get: (k) => data.get(k),
    set: (k, v) => void data.set(k, v),
    subscribe: (_key, listener) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
  };
  const otherTabWrites = (key: string, value: string) => {
    data.set(key, value);
    for (const listener of listeners) listener();
  };
  return { store, data, listeners, otherTabWrites };
};

function WordProbe() {
  const { state, dispatch } = useEditor();
  return (
    <>
      <output aria-label="probe">{state.word.length}</output>
      <button
        type="button"
        onClick={() => {
          dispatch({ type: 'undo' });
        }}
      >
        probe undo
      </button>
    </>
  );
}

const setup = (word: Word = ids('f', 'l', 'turned-script-a', 'g'), stored = memoryStore()) => {
  let closed = 0;
  const saveText = vi.fn<Downloads['saveText']>();
  const view = render(
    <Providers initialWord={word} services={{ store: stored.store, downloads: { saveText } }}>
      <AnnouncerProvider>
        <SavedWordsDialog
          open
          onClose={() => {
            closed += 1;
          }}
        />
        <WordProbe />
      </AnnouncerProvider>
    </Providers>,
  );
  const dialog = screen.getByRole('dialog', { name: 'Saved words' });
  return { dialog, stored, view, saveText, user: userEvent.setup(), closedCount: () => closed };
};

/**
 * An exact name whose first space is optional: jsdom drops the space at the
 * edge of a visually hidden span, browsers keep it.
 */
const named = (text: string) =>
  new RegExp(`^${text.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&').replace(' ', '\\s?')}$`);

const savedJson = (data: Map<string, string>): unknown =>
  JSON.parse(data.get(SAVED_WORDS_STORAGE_KEY) ?? '[]');

describe('<SavedWordsDialog> (FR-16)', () => {
  it('saves the current word with a gloss, and stores it', async () => {
    const { dialog, user, stored } = setup();
    expect(within(dialog).getByText('No saved words yet.')).toBeInTheDocument();
    await user.type(within(dialog).getByLabelText(/^Gloss for \/flɒɡ\//), '  a flag  ');
    await user.click(within(dialog).getByRole('button', { name: 'Save current word' }));
    const list = within(dialog).getByRole('list', { name: 'Saved words' });
    expect(within(list).getByText('/flɒɡ/')).toBeInTheDocument();
    expect(within(list).getByText('a flag')).toBeInTheDocument();
    expect(savedJson(stored.data)).toEqual([
      expect.objectContaining({ fragment: 'w=1:f.l.turned-script-a.g', gloss: 'a flag' }),
    ]);
    expect(await screen.findByText('Saved /flɒɡ/')).toBeInTheDocument();
  });

  it('cannot save an empty word', () => {
    const { dialog } = setup([]);
    expect(within(dialog).getByRole('button', { name: 'Save current word' })).toBeDisabled();
    expect(within(dialog).getByText(/Build a word first/)).toBeInTheDocument();
  });

  it('loads a saved word as one undoable edit, and closes', async () => {
    const stored = memoryStore({
      [SAVED_WORDS_STORAGE_KEY]: JSON.stringify([
        { id: 'a', fragment: 'w=1:esh.i.p', gloss: 'ship', savedAt: 1 },
      ]),
    });
    const { dialog, user, closedCount } = setup(ids('f'), stored);
    await user.click(within(dialog).getByRole('button', { name: named('Load /ʃip/ (ship)') }));
    expect(screen.getByLabelText('probe')).toHaveTextContent('3');
    expect(closedCount()).toBe(1);
    await user.click(screen.getByRole('button', { name: 'probe undo' }));
    expect(screen.getByLabelText('probe')).toHaveTextContent('1');
  });

  it('renames an entry; Escape cancels the rename without closing the dialog', async () => {
    const stored = memoryStore({
      [SAVED_WORDS_STORAGE_KEY]: JSON.stringify([
        { id: 'a', fragment: 'w=1:esh.i.p', gloss: '', savedAt: 1 },
      ]),
    });
    const { dialog, user, closedCount } = setup(ids('f'), stored);
    expect(within(dialog).getByText('No gloss')).toBeInTheDocument();
    await user.click(within(dialog).getByRole('button', { name: named('Rename /ʃip/') }));
    const field = within(dialog).getByRole('textbox', { name: 'Gloss for /ʃip/' });
    expect(field).toHaveFocus();
    await user.type(field, 'boat{Escape}');
    expect(closedCount()).toBe(0);
    expect(within(dialog).getByText('No gloss')).toBeInTheDocument();
    expect(within(dialog).getByRole('button', { name: named('Rename /ʃip/') })).toHaveFocus();

    await user.click(within(dialog).getByRole('button', { name: named('Rename /ʃip/') }));
    await user.type(within(dialog).getByRole('textbox', { name: 'Gloss for /ʃip/' }), 'boat');
    await user.click(within(dialog).getByRole('button', { name: named('Save gloss for /ʃip/') }));
    expect(within(dialog).getByText('boat')).toBeInTheDocument();
    expect(
      within(dialog).getByRole('button', { name: named('Rename /ʃip/ (boat)') }),
    ).toHaveFocus();
    expect(savedJson(stored.data)).toEqual([expect.objectContaining({ gloss: 'boat' })]);

    await user.click(within(dialog).getByRole('button', { name: named('Rename /ʃip/ (boat)') }));
    await user.click(within(dialog).getByRole('button', { name: 'Cancel' }));
    expect(within(dialog).getByText('boat')).toBeInTheDocument();
  });

  it('deletes an entry and returns focus to the gloss field', async () => {
    const stored = memoryStore({
      [SAVED_WORDS_STORAGE_KEY]: JSON.stringify([
        { id: 'a', fragment: 'w=1:esh.i.p', gloss: 'ship', savedAt: 1 },
        { id: 'b', fragment: 'w=1:f', gloss: '', savedAt: 2 },
      ]),
    });
    const { dialog, user } = setup(ids('f'), stored);
    await user.click(within(dialog).getByRole('button', { name: named('Delete /ʃip/ (ship)') }));
    expect(within(dialog).queryByText('ship')).not.toBeInTheDocument();
    expect(within(dialog).getByRole('textbox', { name: /^Gloss for/ })).toHaveFocus();
    expect(savedJson(stored.data)).toEqual([expect.objectContaining({ id: 'b' })]);
  });

  describe('with another tab (#2)', () => {
    const ship = { id: 'a', fragment: 'w=1:esh.i.p', gloss: 'ship', savedAt: 1 };
    const fog = { id: 'c', fragment: 'w=1:f.turned-script-a.g', gloss: 'fog', savedAt: 3 };

    it('shows a word another tab saves, and keeps it when this tab saves one', async () => {
      const { dialog, user, stored } = setup();
      act(() => {
        stored.otherTabWrites(SAVED_WORDS_STORAGE_KEY, JSON.stringify([ship]));
      });
      expect(within(dialog).getByText('ship')).toBeInTheDocument();

      await user.click(within(dialog).getByRole('button', { name: 'Save current word' }));
      expect(savedJson(stored.data)).toEqual([
        expect.objectContaining({ fragment: 'w=1:f.l.turned-script-a.g' }),
        expect.objectContaining({ id: 'a' }),
      ]);
    });

    it("keeps another tab's word even before this tab hears of it", async () => {
      const { dialog, user, stored } = setup();
      // Another tab's write whose storage event hasn't arrived yet.
      stored.data.set(SAVED_WORDS_STORAGE_KEY, JSON.stringify([fog]));
      await user.click(within(dialog).getByRole('button', { name: 'Save current word' }));
      expect(savedJson(stored.data)).toEqual([
        expect.objectContaining({ fragment: 'w=1:f.l.turned-script-a.g' }),
        expect.objectContaining({ id: 'c' }),
      ]);
      expect(within(dialog).getByText('fog')).toBeInTheDocument();
    });

    it('drops a word another tab deletes', () => {
      const { dialog, stored } = setup(
        ids('f'),
        memoryStore({ [SAVED_WORDS_STORAGE_KEY]: JSON.stringify([ship, fog]) }),
      );
      act(() => {
        stored.otherTabWrites(SAVED_WORDS_STORAGE_KEY, JSON.stringify([fog]));
      });
      expect(within(dialog).queryByText('ship')).not.toBeInTheDocument();
      expect(within(dialog).getByText('fog')).toBeInTheDocument();
    });

    it('stops listening when unmounted', () => {
      const { stored, view } = setup();
      expect(stored.listeners.size).toBe(1);
      view.unmount();
      expect(stored.listeners.size).toBe(0);
    });
  });
});

describe('<SavedWordsDialog> export and import (FR-18)', () => {
  /** The announcer's live region (the probe's `<output>` is a status too). */
  const announced = () => document.querySelector('[aria-live]')?.textContent;
  const saved = (id: string, fragment: string, gloss = '') => ({ id, fragment, gloss, savedAt: 1 });
  const pick = (dialog: HTMLElement, text: string, name = 'words.json') => {
    const input = dialog.querySelector('input[type="file"]');
    if (!(input instanceof HTMLInputElement)) throw new Error('no file input');
    fireEvent.change(input, { target: { files: [new File([text], name)] } });
  };

  it('exports the list as a dated, versioned JSON file, and says so', async () => {
    const stored = memoryStore({
      [SAVED_WORDS_STORAGE_KEY]: JSON.stringify([saved('a', 'w=1:f', 'eff')]),
    });
    const { dialog, saveText, user } = setup(ids('f'), stored);
    await user.click(within(dialog).getByRole('button', { name: 'Export' }));
    expect(saveText).toHaveBeenCalledWith(
      expect.stringMatching(/^ipa-helper-saved-words-\d{4}-\d{2}-\d{2}\.json$/),
      expect.stringContaining('"format": "ipa-helper/saved-words"'),
      'application/json',
    );
    expect(within(dialog).getByText('Exported 1 word.')).toBeInTheDocument();
    expect(announced()).toBe('Exported 1 word.');
  });

  it('cannot export an empty list', () => {
    const { dialog } = setup();
    expect(within(dialog).getByRole('button', { name: 'Export' })).toBeDisabled();
  });

  it('imports a file, skipping words already saved, and reports the counts', async () => {
    const stored = memoryStore({
      [SAVED_WORDS_STORAGE_KEY]: JSON.stringify([saved('a', 'w=1:f', 'eff')]),
    });
    const { dialog } = setup(ids('f'), stored);
    // An exported file with one broken entry added by hand.
    const words = [saved('a', 'w=1:f', 'eff'), saved('b', 'w=1:k'), { id: 'broken' }];
    pick(dialog, JSON.stringify({ format: 'ipa-helper/saved-words', version: 1, words }));
    const summary =
      'Imported 1 word. Skipped 1 word already saved. Left out 1 word that couldn’t be read.';
    expect(await within(dialog).findByText(summary)).toBeInTheDocument();
    expect(announced()).toBe(summary);
    const list = within(dialog).getByRole('list', { name: 'Saved words' });
    expect(
      within(list)
        .getAllByRole('listitem')
        .map((li) => li.firstChild?.textContent),
    ).toEqual(['/f/', '/k/']);
    expect(savedJson(stored.data)).toHaveLength(2);
  });

  it("says why a file can't be imported, and changes nothing", async () => {
    const { dialog, stored } = setup();
    pick(dialog, 'not json');
    expect(
      await within(dialog).findByText('That file isn’t a saved-words export from ipa-helper.'),
    ).toBeInTheDocument();
    pick(dialog, JSON.stringify({ format: 'ipa-helper/saved-words', version: 9, words: [] }));
    expect(
      await within(dialog).findByText(/from a newer version of ipa-helper/),
    ).toBeInTheDocument();
    expect(stored.data.has(SAVED_WORDS_STORAGE_KEY)).toBe(false);
  });

  it("says so when the file can't be read", async () => {
    const { dialog } = setup();
    const input = dialog.querySelector('input[type="file"]');
    if (!(input instanceof HTMLInputElement)) throw new Error('no file input');
    const broken = new File([''], 'x.json');
    vi.spyOn(broken, 'text').mockRejectedValue(new Error('gone'));
    fireEvent.change(input, { target: { files: [broken] } });
    expect(await within(dialog).findByText('Couldn’t read that file.')).toBeInTheDocument();
  });

  it('Import… opens the file picker, and an empty pick does nothing', async () => {
    const { dialog, user } = setup();
    const input = dialog.querySelector('input[type="file"]');
    if (!(input instanceof HTMLInputElement)) throw new Error('no file input');
    const click = vi.spyOn(input, 'click');
    await user.click(within(dialog).getByRole('button', { name: 'Import…' }));
    expect(click).toHaveBeenCalledOnce();
    fireEvent.change(input, { target: { files: [] } });
    expect(announced()).toBe('');
  });

  it('summarises counts in words', () => {
    expect(importSummary({ added: 2, skipped: 0, invalid: 0 })).toBe('Imported 2 words.');
    expect(importSummary({ added: 0, skipped: 3, invalid: 0 })).toBe(
      'Imported 0 words. Skipped 3 words already saved.',
    );
  });
});

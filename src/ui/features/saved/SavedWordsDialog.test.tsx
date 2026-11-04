import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';

import { SavedWordsDialog } from './SavedWordsDialog';
import { Providers } from '../../../app/providers';
import { symbolId } from '../../../domain/inventory/symbol-id';
import type { KeyValueStore } from '../../../domain/ports';
import { wordFromIds } from '../../../domain/word/word';
import type { Word } from '../../../domain/word/word';
import { useEditor } from '../../../state/hooks';
import { SAVED_WORDS_STORAGE_KEY } from '../../../state/saved-words';
import { AnnouncerProvider } from '../../components/Announcer';

const ids = (...raw: string[]) => wordFromIds(raw.map(symbolId));

const memoryStore = (initial: Record<string, string> = {}) => {
  const data = new Map(Object.entries(initial));
  const store: KeyValueStore = { get: (k) => data.get(k), set: (k, v) => void data.set(k, v) };
  return { store, data };
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
  render(
    <Providers initialWord={word} services={{ store: stored.store }}>
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
  return { dialog, stored, user: userEvent.setup(), closedCount: () => closed };
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
});

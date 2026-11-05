import { fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';

import { PasteDialog } from './PasteDialog';
import { Providers } from '../../../app/providers';
import { symbolId } from '../../../domain/inventory/symbol-id';
import { idsOf, wordFromIds } from '../../../domain/word/word';
import { useEditor } from '../../../state/hooks';
import { DEFAULT_SETTINGS } from '../../../state/settings';
import { AnnouncerProvider } from '../../components/Announcer';

function WordProbe() {
  const { state, dispatch } = useEditor();
  return (
    <>
      <output aria-label="probe">{idsOf(state.word).join(' ')}</output>
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

const setup = (rDisplay: 'narrow' | 'broad' = 'narrow') => {
  let closed = 0;
  render(
    <Providers
      initialWord={wordFromIds([symbolId('p')])}
      initialSettings={{ ...DEFAULT_SETTINGS, rDisplay }}
    >
      <AnnouncerProvider>
        <PasteDialog
          open
          onClose={() => {
            closed += 1;
          }}
        />
        <WordProbe />
      </AnnouncerProvider>
    </Providers>,
  );
  const dialog = screen.getByRole('dialog', { name: 'Paste IPA' });
  const input = within(dialog).getByRole('textbox', { name: 'IPA text' });
  const use = within(dialog).getByRole('button', { name: 'Use as word' });
  /** Pastes `text` into the field in one go, as a real paste does. */
  const paste = (text: string) => {
    fireEvent.change(input, { target: { value: text } });
  };
  return { dialog, input, use, paste, user: userEvent.setup(), closedCount: () => closed };
};

const probe = () => screen.getByRole('status', { name: 'probe' });

describe('<PasteDialog> (FR-17)', () => {
  it('starts empty, with an example and nothing to use', () => {
    const { dialog, use } = setup();
    expect(within(dialog).getByText(/For example/)).toHaveTextContent('/ˈθɔːnɪk/');
    expect(use).toBeDisabled();
  });

  it('FR-17: shows how pasted IPA reads, then uses it as the word in one undoable step', async () => {
    const { dialog, input, use, paste, user, closedCount } = setup();
    paste('/ˈt͡ʃiːz/');
    expect(within(dialog).getByText(/Reads as/)).toHaveTextContent('Reads as /ˈtʃiːz/, 4 symbols.');
    expect(input).toHaveAttribute('aria-invalid', 'false');
    await user.click(use);
    expect(probe()).toHaveTextContent('primary-stress tesh i-long z');
    expect(closedCount()).toBe(1);
    expect(await screen.findByText('Word is now /ˈtʃiːz/')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'probe undo' }));
    expect(probe()).toHaveTextContent('p');
  });

  it('FR-17: names unknown characters and their positions, and won’t use the text', async () => {
    const { dialog, input, use, paste, user } = setup();
    paste('ab5 c̨');
    expect(within(dialog).getByText(/Not recognised/)).toHaveTextContent(
      'Not recognised: ‘5’ at position 3, a space at position 4, ‘◌̨’ at position 6.',
    );
    expect(input).toHaveAttribute('aria-invalid', 'true');
    expect(use).toBeDisabled();
    // Enter submits the form, which does nothing while the text has errors.
    await user.type(input, '{Enter}');
    expect(probe()).toHaveTextContent('p');
  });

  it('says "1 symbol" for one, and Enter uses the word', async () => {
    const { dialog, input, paste, user } = setup();
    paste('ʃ');
    expect(within(dialog).getByText(/Reads as/)).toHaveTextContent('1 symbol.');
    await user.type(input, '{Enter}');
    expect(probe()).toHaveTextContent('esh');
  });

  it('Q-3: reads r as the British ɹ when r is shown broad', async () => {
    const { use, paste, user } = setup('broad');
    paste('rɛd');
    await user.click(use);
    expect(probe()).toHaveTextContent('turned-r epsilon d');
  });
});

import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { App } from '../../../app/App';
import { Providers } from '../../../app/providers';
import { symbolId } from '../../../domain/inventory/symbol-id';
import { NULL_FRAGMENTS } from '../../../domain/ports';
import type { Clipboard } from '../../../domain/ports';
import { ok } from '../../../domain/result';
import { wordFromIds } from '../../../domain/word/word';
import type { Word } from '../../../domain/word/word';

const ids = (...raw: string[]) => wordFromIds(raw.map(symbolId));

const setup = (initialWord: Word = ids('s', 'i', 'p')) => {
  const writeText = vi.fn<Clipboard['writeText']>(() => Promise.resolve(ok(undefined)));
  render(
    <Providers
      initialWord={initialWord}
      services={{ clipboard: { writeText }, fragments: NULL_FRAGMENTS }}
    >
      <App />
    </Providers>,
  );
  const word = screen.getByRole('textbox', { name: 'Word' });
  return { writeText, word, user: userEvent.setup() };
};

describe('global shortcuts (FR-51)', () => {
  it('Backspace and Delete edit the word from anywhere outside a text input', async () => {
    const { user, word } = setup();
    await user.click(screen.getByRole('heading', { level: 1 }));
    await user.keyboard('{Backspace}');
    expect(word).toHaveTextContent('/si/');
    await user.keyboard('{ArrowLeft}{ArrowLeft}{Delete}');
    expect(word).toHaveTextContent('/i/');
  });

  it('← and → move the cursor, so the next key inserts there', async () => {
    const { user, word } = setup();
    await user.click(screen.getByRole('heading', { level: 1 }));
    await user.keyboard('{ArrowLeft}{ArrowLeft}{ArrowRight}');
    await user.click(screen.getByRole('button', { name: /^ʃ\s?,/ }));
    expect(word).toHaveTextContent('/siʃp/');
  });

  it('Backspace on a palette key deletes, but arrows there move between keys', async () => {
    const { user, word } = setup();
    const theta = screen.getByRole('button', { name: /^θ\s?,/ });
    theta.focus();
    await user.keyboard('{ArrowRight}');
    expect(screen.getByRole('button', { name: /^ð\s?,/ })).toHaveFocus();
    await user.keyboard('{Backspace}');
    expect(word).toHaveTextContent('/si/');
  });

  it('leaves typed keys alone in text inputs and modified keys alone everywhere', async () => {
    const { user, word } = setup();
    const input = document.createElement('input');
    document.body.append(input);
    input.focus();
    await user.keyboard('{Backspace}?');
    expect(word).toHaveTextContent('/sip/');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    await user.click(screen.getByRole('heading', { level: 1 }));
    await user.keyboard('{Alt>}{Backspace}{/Alt}{Shift>}{ArrowLeft}{/Shift}');
    expect(word).toHaveTextContent('/sip/');
    input.remove();
  });

  it('FR-14: Ctrl/Cmd+Z undoes and Ctrl/Cmd+Shift+Z or Ctrl+Y redoes from a palette key', async () => {
    const { user, word } = setup();
    await user.click(screen.getByRole('button', { name: /^ʃ\s?,/ }));
    expect(word).toHaveTextContent('/sipʃ/');
    await user.keyboard('{Control>}z{/Control}');
    expect(word).toHaveTextContent('/sip/');
    await user.keyboard('{Control>}{Shift>}Z{/Shift}{/Control}');
    expect(word).toHaveTextContent('/sipʃ/');
    await user.keyboard('{Meta>}z{/Meta}');
    expect(word).toHaveTextContent('/sip/');
    await user.keyboard('{Control>}y{/Control}');
    expect(word).toHaveTextContent('/sipʃ/');
  });

  it('FR-14: Ctrl+Z in a text field or a dialog leaves the word alone', async () => {
    const { user, word } = setup();
    await user.click(screen.getByRole('button', { name: /^ʃ\s?,/ }));
    await user.click(screen.getByRole('searchbox', { name: 'Filter symbols' }));
    await user.keyboard('{Control>}z{/Control}{Control>}y{/Control}');
    expect(word).toHaveTextContent('/sipʃ/');
    await user.click(screen.getByRole('button', { name: 'Keyboard shortcuts' }));
    screen.getByRole('button', { name: 'Close' }).focus();
    await user.keyboard('{Control>}z{/Control}');
    expect(word).toHaveTextContent('/sipʃ/');
  });

  it('Ctrl+Shift+C copies the IPA and Ctrl+Shift+L the TIPA, with an announcement', async () => {
    const { user, writeText } = setup(ids('esh', 'i', 'p'));
    await user.click(screen.getByRole('heading', { level: 1 }));
    await user.keyboard('{Control>}{Shift>}C{/Shift}{/Control}');
    await user.keyboard('{Meta>}{Shift>}L{/Shift}{/Meta}');
    expect(writeText.mock.calls.map(([text]) => text)).toEqual(['/ʃip/', 'Sip']);
    expect(await screen.findByText('Copied TIPA')).toBeInTheDocument();
  });

  it('says there is nothing to copy for an empty word', async () => {
    const { user, writeText } = setup([]);
    await user.click(screen.getByRole('heading', { level: 1 }));
    await user.keyboard('{Control>}{Shift>}L{/Shift}{/Control}');
    expect(writeText).not.toHaveBeenCalled();
    expect(await screen.findByText('Nothing to copy yet')).toBeInTheDocument();
  });

  it('? opens the shortcuts dialog, where the word keys stop acting on the word', async () => {
    const { user, word } = setup();
    await user.click(screen.getByRole('heading', { level: 1 }));
    await user.keyboard('?');
    const dialog = screen.getByRole('dialog', { name: 'Keyboard shortcuts' });
    screen.getByRole('button', { name: 'Close' }).focus();
    await user.keyboard('{Backspace}');
    expect(word).toHaveTextContent('/sip/');
    act(() => {
      dialog.dispatchEvent(new Event('close'));
    });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('/ focuses the filter, which then narrows the palette (FR-4)', async () => {
    const { user, word } = setup();
    await user.click(screen.getByRole('heading', { level: 1 }));
    await user.keyboard('/');
    const filter = screen.getByRole('searchbox', { name: 'Filter symbols' });
    expect(filter).toHaveFocus();
    await user.keyboard('ship{Backspace}');
    expect(filter).toHaveValue('shi');
    expect(word).toHaveTextContent('/sip/');
    expect(screen.getAllByRole('button', { name: /, as in\s?ship$/ })).toHaveLength(1);
    expect(screen.queryByRole('button', { name: /^p\s?,/ })).not.toBeInTheDocument();
  });

  it('FR-3: the inventory switch starts on RP and switches to the full IPA', async () => {
    const { user } = setup();
    const inventory = screen.getByRole('combobox', { name: 'Inventory' });
    expect(inventory).toHaveValue('rp');
    expect(screen.queryByRole('region', { name: 'Non-pulmonic consonants' })).toBeNull();
    await user.selectOptions(inventory, 'Full IPA');
    expect(inventory).toHaveValue('extended');
    expect(screen.getByRole('region', { name: 'Non-pulmonic consonants' })).toBeInTheDocument();
  });

  it('the top bar button opens the same dialog', async () => {
    const { user } = setup();
    await user.click(screen.getByRole('button', { name: 'Keyboard shortcuts' }));
    expect(screen.getByRole('dialog', { name: 'Keyboard shortcuts' })).toBeInTheDocument();
  });
});

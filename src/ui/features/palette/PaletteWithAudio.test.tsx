import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { PaletteWithAudio } from './PaletteWithAudio';
import { fakeAudio } from '../../../../tests/setup/fake-audio';
import { Providers } from '../../../app/providers';
import { symbolId } from '../../../domain/inventory/symbol-id';
import type { InventoryId, PhoneSymbol } from '../../../domain/inventory/types';
import { err } from '../../../domain/result';
import { AnnouncerProvider } from '../../components/Announcer';

const setup = (soundOnSelect: boolean, player = fakeAudio(), inventory: InventoryId = 'rp') => {
  const onActivate = vi.fn<(s: PhoneSymbol) => void>();
  const { container } = render(
    <Providers services={{ audio: player.audio }}>
      <AnnouncerProvider>
        <PaletteWithAudio
          inventory={inventory}
          glyphs={{ rDisplay: 'narrow', tieBars: false }}
          query=""
          collapsedGroups={[]}
          onToggleGroup={() => undefined}
          soundOnSelect={soundOnSelect}
          onActivate={onActivate}
        />
      </AnnouncerProvider>
    </Providers>,
  );
  const key = (name: RegExp) => screen.getByRole('button', { name });
  const speakers = () => container.querySelectorAll('button[title^="Listen"]');
  return { ...player, onActivate, key, speakers, user: userEvent.setup() };
};

describe('<PaletteWithAudio>', () => {
  it('FR-30: gives every sounding key a speaker that plays it', async () => {
    const { playSymbol, speakers, user } = setup(false);
    expect(speakers()).toHaveLength(51);
    const esh = [...speakers()].find((s) => s.getAttribute('title') === 'Listen to ʃ');
    if (!(esh instanceof HTMLElement)) throw new Error('no ʃ speaker');
    await user.click(esh);
    expect(playSymbol).toHaveBeenCalledWith(symbolId('esh'));
  });

  it('FR-34: plays each sounding symbol as it is added when Sound on select is on', async () => {
    const { key, onActivate, playSymbol, user } = setup(true);
    await user.click(key(/^ʃ/));
    expect(onActivate).toHaveBeenCalledTimes(1);
    expect(playSymbol).toHaveBeenCalledWith(symbolId('esh'));
    await user.click(key(/primary stress/));
    expect(playSymbol).toHaveBeenCalledTimes(1);
  });

  it('FR-34: adds silently when Sound on select is off', async () => {
    const { key, onActivate, playSymbol, user } = setup(false);
    await user.click(key(/^ʃ/));
    expect(onActivate).toHaveBeenCalledTimes(1);
    expect(playSymbol).not.toHaveBeenCalled();
  });

  it('announces a sound that could not be played', async () => {
    const { key, user } = setup(false, fakeAudio('idle', err({ kind: 'audio-load-failed' })));
    key(/^ʃ/).focus();
    await user.keyboard('{Alt>}{Enter}{/Alt}');
    expect(await screen.findByText('Couldn’t play ʃ')).toBeInTheDocument();
  });

  it('ADR-0012: gives no speaker to a sound without a clip, and adds it silently', async () => {
    const player = fakeAudio();
    player.canPlaySymbol.mockImplementation((id) => id !== symbolId('c-cedilla'));
    const { key, onActivate, playSymbol, speakers, user } = setup(true, player, 'extended');
    const titles = [...speakers()].map((s) => s.getAttribute('title'));
    expect(titles).toContain('Listen to ʃ');
    expect(titles).not.toContain('Listen to ç');
    await user.click(key(/^ç/));
    expect(onActivate).toHaveBeenCalledTimes(1);
    expect(playSymbol).not.toHaveBeenCalled();
  });

  it('shows no speakers when the browser cannot play audio', () => {
    const { speakers } = setup(true, fakeAudio('unsupported'));
    expect(speakers()).toHaveLength(0);
  });
});

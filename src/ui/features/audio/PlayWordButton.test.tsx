import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';

import { PlayWordButton } from './PlayWordButton';
import { fakeAudio } from '../../../../tests/setup/fake-audio';
import { Providers } from '../../../app/providers';
import { symbolId } from '../../../domain/inventory/symbol-id';
import type { AudioError } from '../../../domain/ports';
import { err, ok } from '../../../domain/result';
import type { Result } from '../../../domain/result';
import { wordFromIds } from '../../../domain/word/word';
import { AnnouncerProvider } from '../../components/Announcer';

const word = (...ids: string[]) => wordFromIds(ids.map(symbolId));

const setup = (
  initialWord = word('primary-stress', 'k', 'ash', 't'),
  result: Result<void, AudioError> = ok(undefined),
) => {
  const player = fakeAudio('idle', result, 'idle');
  render(
    <Providers initialWord={initialWord} services={{ audio: player.audio }}>
      <AnnouncerProvider>
        <PlayWordButton />
      </AnnouncerProvider>
    </Providers>,
  );
  const button = () => screen.getByRole('button', { name: /Play word|Loading voice/ });
  return { ...player, button, user: userEvent.setup() };
};

describe('<PlayWordButton>', () => {
  it('FR-31: plays the word being edited', async () => {
    const { button, playWord, user } = setup();
    await user.click(button());
    expect(playWord).toHaveBeenCalledWith(word('primary-stress', 'k', 'ash', 't'));
  });

  it('is disabled for an empty word', () => {
    setup(word());
    expect(screen.getByRole('button', { name: 'Play word' })).toBeDisabled();
  });

  it('is disabled for a word of marks alone', () => {
    setup(word('primary-stress', 'length'));
    expect(screen.getByRole('button', { name: 'Play word' })).toBeDisabled();
  });

  it('FR-33: shows the voice loading, with its progress, and ignores clicks meanwhile', async () => {
    const { button, playWord, set, user } = setup();
    act(() => {
      set('words', 'loading', 0.42);
    });
    expect(button()).toHaveAccessibleName('Loading voice…');
    expect(button()).toHaveAttribute('aria-disabled', 'true');
    const bar = screen.getByRole('progressbar', { name: 'Downloading the voice' });
    expect(bar).toHaveAttribute('value', '0.42');
    await user.click(button());
    expect(playWord).not.toHaveBeenCalled();

    act(() => {
      set('words', 'loading', undefined);
    });
    expect(screen.getByRole('progressbar')).not.toHaveAttribute('value');

    act(() => {
      set('words', 'ready');
    });
    expect(button()).toHaveAccessibleName('Play word');
    expect(button()).not.toHaveAttribute('aria-disabled');
    expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
  });

  it('shows and announces a failure, and clears it on the next try', async () => {
    const { button, playWord, user } = setup(undefined, err({ kind: 'audio-load-failed' }));
    await user.click(button());
    const message = 'Couldn’t load the voice. Check your connection and try again.';
    expect(button()).toHaveAccessibleDescription(message);
    expect(screen.getByRole('status')).toHaveTextContent(message);

    playWord.mockResolvedValueOnce(ok(undefined));
    await user.click(button());
    expect(button()).not.toHaveAccessibleDescription();
  });

  it('names a playback failure differently', async () => {
    const { button, user } = setup(undefined, err({ kind: 'audio-playback-failed' }));
    await user.click(button());
    expect(button()).toHaveAccessibleDescription('Couldn’t play the word. Try again.');
  });

  it('renders nothing when the browser cannot speak words', () => {
    render(
      <Providers initialWord={word('ash')}>
        <PlayWordButton />
      </Providers>,
    );
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });
});

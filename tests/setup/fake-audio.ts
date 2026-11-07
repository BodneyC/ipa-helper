import { vi } from 'vitest';

import type { AudioChannel, AudioError, AudioPlayer, AudioStatus } from '../../src/domain/ports';
import { mapResult, ok } from '../../src/domain/result';
import type { Result } from '../../src/domain/result';

/**
 * An AudioPlayer for UI tests. It records what it was asked to play, answers
 * with `result`, and lets the test move a channel's status and progress.
 */
export const fakeAudio = (
  symbols: AudioStatus = 'idle',
  result: Result<void, AudioError> = ok(undefined),
  words: AudioStatus = 'unsupported',
) => {
  let status: AudioPlayer['status'] = { symbols, words };
  let progress: AudioPlayer['progress'] = { symbols: undefined, words: undefined };
  const listeners = new Set<() => void>();
  const notify = () => {
    for (const listener of listeners) listener();
  };
  const playSymbol = vi.fn<AudioPlayer['playSymbol']>(() => Promise.resolve(result));
  const playWord = vi.fn<AudioPlayer['playWord']>(() =>
    Promise.resolve(mapResult(result, () => ({ dropped: [] }))),
  );
  /** Every symbol has a clip unless a test says otherwise (`mockImplementation`). */
  const canPlaySymbol = vi.fn<AudioPlayer['canPlaySymbol']>(() => status.symbols !== 'unsupported');
  const audio: AudioPlayer = {
    get status() {
      return status;
    },
    get progress() {
      return progress;
    },
    subscribe: (listener) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    canPlaySymbol,
    playSymbol,
    playWord,
  };
  /** Moves a channel to a new status (and progress), as the real player would. */
  const set = (channel: AudioChannel, next: AudioStatus, fraction?: number) => {
    status = { ...status, [channel]: next };
    progress = { ...progress, [channel]: fraction };
    notify();
  };
  return { audio, canPlaySymbol, playSymbol, playWord, set };
};

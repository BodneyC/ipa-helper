import { vi } from 'vitest';

import type { AudioError, AudioPlayer, AudioStatus } from '../../src/domain/ports';
import { ok } from '../../src/domain/result';
import type { Result } from '../../src/domain/result';

/** An AudioPlayer for UI tests: records what it was asked to play. */
export const fakeAudio = (
  symbols: AudioStatus = 'idle',
  result: Result<void, AudioError> = ok(undefined),
) => {
  const playSymbol = vi.fn<AudioPlayer['playSymbol']>(() => Promise.resolve(result));
  const audio: AudioPlayer = {
    status: { symbols, words: 'unsupported' },
    subscribe: () => () => undefined,
    playSymbol,
    playWord: () => Promise.resolve(ok(undefined)),
  };
  return { audio, playSymbol };
};

import type { AudioClip, AudioOutput } from './web-audio-output';
import type { SymbolId } from '../../domain/inventory/symbol-id';
import type { AudioChannel, AudioError, AudioPlayer, AudioStatus } from '../../domain/ports';
import { err } from '../../domain/result';
import type { Result } from '../../domain/result';
import type { Word } from '../../domain/word/word';

/** Fetches (and caches, if it wants) the sound for a key. Must not reject: failures are `Result`s. */
export type ClipSource<K> = (key: K) => Promise<Result<AudioClip, AudioError>>;

interface AudioPlayerOptions {
  readonly output: AudioOutput;
  /** Per-symbol clips (M4.3). Without it, `playSymbol` reports `audio-unsupported`. */
  readonly symbols?: ClipSource<SymbolId> | undefined;
  /** Word synthesis (M5.2). Without it, `playWord` reports `audio-unsupported`. */
  readonly words?: ClipSource<Word> | undefined;
}

/**
 * The AudioPlayer port (ARCHITECTURE §8): asks a channel's source for a clip,
 * tracks that channel's lazy start-up status (FR-33), then plays the clip
 * through the output.
 */
export const createAudioPlayer = ({ output, symbols, words }: AudioPlayerOptions): AudioPlayer => {
  const initial = (source: ClipSource<never> | undefined): AudioStatus =>
    output.supported && source !== undefined ? 'idle' : 'unsupported';
  let status: Readonly<Record<AudioChannel, AudioStatus>> = {
    symbols: initial(symbols),
    words: initial(words),
  };
  const inFlight: Record<AudioChannel, number> = { symbols: 0, words: 0 };
  const listeners = new Set<() => void>();

  const setStatus = (channel: AudioChannel, next: AudioStatus) => {
    if (status[channel] === next) return;
    status = { ...status, [channel]: next };
    for (const listener of listeners) listener();
  };

  const play = async <K>(
    channel: AudioChannel,
    source: ClipSource<K> | undefined,
    key: K,
  ): Promise<Result<void, AudioError>> => {
    if (source === undefined || status[channel] === 'unsupported') {
      return err({ kind: 'audio-unsupported' });
    }
    if (status[channel] === 'idle') setStatus(channel, 'loading');
    inFlight[channel] += 1;
    const clip = await source(key);
    inFlight[channel] -= 1;
    if (!clip.ok) {
      if (status[channel] === 'loading' && inFlight[channel] === 0) setStatus(channel, 'idle');
      return clip;
    }
    setStatus(channel, 'ready');
    return output.play(clip.value);
  };

  return {
    get status() {
      return status;
    },
    subscribe: (listener) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    playSymbol: (id) => play('symbols', symbols, id),
    playWord: (word) => play('words', words, word),
  };
};

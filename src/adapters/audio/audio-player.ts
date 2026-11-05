import type { AudioClip, AudioOutput } from './web-audio-output';
import type { SymbolId } from '../../domain/inventory/symbol-id';
import type { AudioChannel, AudioError, AudioPlayer, AudioStatus } from '../../domain/ports';
import { err } from '../../domain/result';
import type { Result } from '../../domain/result';
import type { Word } from '../../domain/word/word';

/**
 * Fetches (and caches, if it wants) the sound for a key. Must not reject:
 * failures are `Result`s. A source with a slow first load (the word voice)
 * reports how much has arrived, from 0 to 1, through `onProgress`.
 */
export type ClipSource<K> = (
  key: K,
  onProgress?: (fraction: number) => void,
) => Promise<Result<AudioClip, AudioError>>;

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
  let progress: Readonly<Record<AudioChannel, number | undefined>> = {
    symbols: undefined,
    words: undefined,
  };
  const inFlight: Record<AudioChannel, number> = { symbols: 0, words: 0 };
  const listeners = new Set<() => void>();
  const notify = () => {
    for (const listener of listeners) listener();
  };

  const setProgress = (channel: AudioChannel, next: number | undefined) => {
    if (progress[channel] === next) return;
    progress = { ...progress, [channel]: next };
    notify();
  };

  const setStatus = (channel: AudioChannel, next: AudioStatus) => {
    if (status[channel] === next) return;
    status = { ...status, [channel]: next };
    // Progress only means something while a channel is loading.
    if (next !== 'loading') progress = { ...progress, [channel]: undefined };
    notify();
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
    const clip = await source(key, (fraction) => {
      if (status[channel] === 'loading') setProgress(channel, Math.min(1, Math.max(0, fraction)));
    });
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
    get progress() {
      return progress;
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

import type { AudioError } from '../../domain/ports';
import { err, ok } from '../../domain/result';
import type { Result } from '../../domain/result';

/** Sound ready to play: compressed bytes (a static clip, M4.3) or raw samples (synthesis, M5.2). */
export type AudioClip =
  | { readonly kind: 'encoded'; readonly data: ArrayBuffer }
  | { readonly kind: 'pcm'; readonly samples: Float32Array; readonly sampleRate: number };

/** Plays one clip at a time: starting a clip cuts off the one before. */
export interface AudioOutput {
  /** False when the browser has no Web Audio; every `play` then fails with `audio-unsupported`. */
  readonly supported: boolean;
  /** Resolves when the clip ends or a newer one cuts it off. */
  play(clip: AudioClip): Promise<Result<void, AudioError>>;
}

// The slices of the Web Audio API the output uses. `AudioContext` satisfies
// them structurally, and tests satisfy them with small fakes.
interface PlaybackBuffer {
  getChannelData(channel: number): Float32Array;
}

interface PlaybackSource<B, D> {
  buffer: B | null;
  connect(destination: D): unknown;
  addEventListener(type: 'ended', listener: () => void): void;
  start(): void;
  stop(): void;
}

/** The parts of an `AudioContext` the output uses. */
export interface PlaybackContext<B extends PlaybackBuffer, D> {
  readonly state: string;
  readonly destination: D;
  resume(): Promise<void>;
  createBuffer(channels: number, length: number, sampleRate: number): B;
  decodeAudioData(data: ArrayBuffer): Promise<B>;
  createBufferSource(): PlaybackSource<B, D>;
}

const unsupported = err({ kind: 'audio-unsupported' as const });
const loadFailed = err({ kind: 'audio-load-failed' as const });
const playbackFailed = err({ kind: 'audio-playback-failed' as const });

/**
 * An AudioOutput over Web Audio (ARCHITECTURE §8). The context is created on
 * the first `play`, which is always inside a user gesture, so the browser's
 * autoplay policy lets it start; it is resumed if the browser suspended it.
 *
 * @param createContext Makes the context, or `undefined` when there is no Web Audio.
 */
export const createWebAudioOutput = <B extends PlaybackBuffer, D>(
  createContext: (() => PlaybackContext<B, D>) | undefined,
): AudioOutput => {
  let context: PlaybackContext<B, D> | undefined;
  let current: PlaybackSource<B, D> | undefined;
  // Bumped by every `play`, so a clip that finishes decoding after a newer
  // request has started is dropped instead of playing over it.
  let generation = 0;

  const toBuffer = async (ctx: PlaybackContext<B, D>, clip: AudioClip): Promise<B> => {
    if (clip.kind === 'encoded') {
      // decodeAudioData detaches its argument; copy so cached clips stay playable.
      return ctx.decodeAudioData(clip.data.slice(0));
    }
    const buffer = ctx.createBuffer(1, clip.samples.length, clip.sampleRate);
    buffer.getChannelData(0).set(clip.samples);
    return buffer;
  };

  return {
    supported: createContext !== undefined,
    play: async (clip) => {
      if (createContext === undefined) return unsupported;
      const mine = (generation += 1);
      let ctx: PlaybackContext<B, D>;
      try {
        ctx = context ??= createContext();
      } catch {
        // The constructor throws when, e.g., the browser's context limit is reached.
        return playbackFailed;
      }
      current?.stop();
      current = undefined;
      try {
        if (ctx.state === 'suspended') await ctx.resume();
      } catch {
        return playbackFailed;
      }
      let buffer: B;
      try {
        buffer = await toBuffer(ctx, clip);
      } catch {
        return loadFailed;
      }
      if (mine !== generation) return ok(undefined);
      const source = ctx.createBufferSource();
      source.buffer = buffer;
      source.connect(ctx.destination);
      return new Promise((resolve) => {
        source.addEventListener('ended', () => {
          if (current === source) current = undefined;
          resolve(ok(undefined));
        });
        current = source;
        source.start();
      });
    },
  };
};

/** The AudioOutput for this browser: Web Audio when it exists, otherwise unsupported. */
export const createBrowserAudioOutput = (): AudioOutput =>
  createWebAudioOutput(typeof AudioContext === 'undefined' ? undefined : () => new AudioContext());

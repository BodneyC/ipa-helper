import { describe, expect, it, vi } from 'vitest';

import {
  createBrowserAudioOutput,
  createWebAudioOutput,
  RESUME_TIMEOUT_MS,
} from './web-audio-output';
import type { AudioClip, PlaybackContext } from './web-audio-output';
import { err, ok } from '../../domain/result';

class FakeBuffer {
  readonly data: Float32Array;
  constructor(
    length: number,
    readonly sampleRate: number,
  ) {
    this.data = new Float32Array(length);
  }
  getChannelData(): Float32Array {
    return this.data;
  }
}

const DESTINATION = { name: 'speakers' };

class FakeSource {
  buffer: FakeBuffer | null = null;
  connectedTo: unknown;
  started = false;
  private readonly ended: (() => void)[] = [];
  connect(destination: unknown) {
    this.connectedTo = destination;
  }
  addEventListener(_type: 'ended', listener: () => void) {
    this.ended.push(listener);
  }
  start() {
    this.started = true;
  }
  /** Like Web Audio, stopping a source fires `ended`. */
  stop() {
    this.finish();
  }
  finish() {
    for (const listener of this.ended) listener();
  }
}

class FakeContext implements PlaybackContext<FakeBuffer, typeof DESTINATION> {
  state = 'running';
  readonly destination = DESTINATION;
  readonly sources: FakeSource[] = [];
  readonly decoded: ArrayBuffer[] = [];
  resume = vi.fn(() => {
    this.state = 'running';
    return Promise.resolve();
  });
  decode: (data: ArrayBuffer) => Promise<FakeBuffer> = () =>
    Promise.resolve(new FakeBuffer(4, 22050));
  createBuffer(_channels: number, length: number, sampleRate: number) {
    if (length === 0) throw new Error('NotSupportedError');
    return new FakeBuffer(length, sampleRate);
  }
  decodeAudioData(data: ArrayBuffer) {
    this.decoded.push(data);
    return this.decode(data);
  }
  createBufferSource() {
    const source = new FakeSource();
    this.sources.push(source);
    return source;
  }
}

const pcm = (samples: number[]): AudioClip => ({
  kind: 'pcm',
  samples: Float32Array.from(samples),
  sampleRate: 22050,
});

/** Lets pending promise callbacks run, so `play` reaches `start()`. */
const settle = () => new Promise((resolve) => setTimeout(resolve, 0));

const setup = () => {
  const ctx = new FakeContext();
  const createContext = vi.fn(() => ctx);
  return { ctx, createContext, output: createWebAudioOutput(createContext) };
};

describe('Web Audio output', () => {
  it('reports unsupported without Web Audio', async () => {
    const output = createWebAudioOutput(undefined);
    expect(output.supported).toBe(false);
    await expect(output.play(pcm([0]))).resolves.toEqual(err({ kind: 'audio-unsupported' }));
  });

  it('FR-33: creates the context lazily, on the first play only', async () => {
    const { ctx, createContext, output } = setup();
    expect(output.supported).toBe(true);
    expect(createContext).not.toHaveBeenCalled();
    const first = output.play(pcm([0.5]));
    await settle();
    ctx.sources[0]?.finish();
    await first;
    const second = output.play(pcm([0.5]));
    await settle();
    ctx.sources[1]?.finish();
    await second;
    expect(createContext).toHaveBeenCalledTimes(1);
  });

  it('plays PCM samples through the destination and resolves when they end', async () => {
    const { ctx, output } = setup();
    let done = false;
    const playing = output.play(pcm([0.25, -0.25])).then((result) => {
      done = true;
      return result;
    });
    await settle();
    const [source] = ctx.sources;
    expect(source?.started).toBe(true);
    expect(source?.connectedTo).toBe(DESTINATION);
    expect(Array.from(source?.buffer?.data ?? [])).toEqual([0.25, -0.25]);
    expect(source?.buffer?.sampleRate).toBe(22050);
    expect(done).toBe(false);
    source?.finish();
    await expect(playing).resolves.toEqual(ok(undefined));
  });

  it('decodes a copy of encoded clips, so a cached clip can play again', async () => {
    const { ctx, output } = setup();
    const data = new Uint8Array([1, 2, 3]).buffer;
    const playing = output.play({ kind: 'encoded', data });
    await settle();
    expect(ctx.decoded[0]).not.toBe(data);
    expect(new Uint8Array(ctx.decoded[0] ?? new ArrayBuffer(0))).toEqual(new Uint8Array([1, 2, 3]));
    ctx.sources[0]?.finish();
    await expect(playing).resolves.toEqual(ok(undefined));
  });

  it('resumes a context the browser suspended', async () => {
    const { ctx, output } = setup();
    ctx.state = 'suspended';
    const playing = output.play(pcm([0]));
    await settle();
    expect(ctx.resume).toHaveBeenCalledTimes(1);
    ctx.sources[0]?.finish();
    await playing;
  });

  it('cuts off the previous clip when a new one starts', async () => {
    const { ctx, output } = setup();
    const first = output.play(pcm([0]));
    await settle();
    const second = output.play(pcm([0]));
    await expect(first).resolves.toEqual(ok(undefined));
    await settle();
    expect(ctx.sources).toHaveLength(2);
    ctx.sources[1]?.finish();
    await expect(second).resolves.toEqual(ok(undefined));
  });

  it('drops a clip that finishes decoding after a newer request', async () => {
    const { ctx, output } = setup();
    let release: (buffer: FakeBuffer) => void = () => undefined;
    ctx.decode = () =>
      new Promise((resolve) => {
        release = resolve;
      });
    const slow = output.play({ kind: 'encoded', data: new ArrayBuffer(1) });
    await settle();
    const releaseSlow = release;
    ctx.decode = () => Promise.resolve(new FakeBuffer(1, 22050));
    const fast = output.play({ kind: 'encoded', data: new ArrayBuffer(1) });
    await settle();
    releaseSlow(new FakeBuffer(1, 22050));
    await expect(slow).resolves.toEqual(ok(undefined));
    expect(ctx.sources).toHaveLength(1);
    ctx.sources[0]?.finish();
    await expect(fast).resolves.toEqual(ok(undefined));
  });

  it('reports undecodable clips and unplayable samples as load failures', async () => {
    const { ctx, output } = setup();
    ctx.decode = () => Promise.reject(new Error('EncodingError'));
    const loadFailed = err({ kind: 'audio-load-failed' });
    await expect(output.play({ kind: 'encoded', data: new ArrayBuffer(1) })).resolves.toEqual(
      loadFailed,
    );
    await expect(output.play(pcm([]))).resolves.toEqual(loadFailed);
  });

  it('reports a context that cannot be created or resumed as a playback failure', async () => {
    const failed = err({ kind: 'audio-playback-failed' });
    const noContext = createWebAudioOutput(() => {
      throw new Error('too many contexts');
    });
    await expect(noContext.play(pcm([0]))).resolves.toEqual(failed);

    const { ctx, output } = setup();
    ctx.state = 'suspended';
    ctx.resume.mockImplementation(() => Promise.reject(new Error('NotAllowedError')));
    await expect(output.play(pcm([0]))).resolves.toEqual(failed);
  });

  it('#3: fails visibly when resume() never settles (no output device), and can recover', async () => {
    vi.useFakeTimers();
    try {
      const { ctx, output } = setup();
      ctx.state = 'suspended';
      ctx.resume.mockImplementation(() => new Promise<void>(() => undefined));
      const first = output.play(pcm([0.1]));
      await vi.advanceTimersByTimeAsync(RESUME_TIMEOUT_MS);
      await expect(first).resolves.toEqual(err({ kind: 'audio-playback-failed' }));

      // The device appears: the next play resumes the same context and plays.
      ctx.resume.mockImplementation(() => {
        ctx.state = 'running';
        return Promise.resolve();
      });
      const second = output.play(pcm([0.1]));
      await vi.advanceTimersByTimeAsync(0);
      expect(ctx.resume).toHaveBeenCalledTimes(2);
      expect(ctx.sources).toHaveLength(1);
      ctx.sources[0]?.finish();
      await expect(second).resolves.toEqual(ok(undefined));
    } finally {
      vi.useRealTimers();
    }
  });

  it('#3: a resume() that settles in time plays as before, with its timer cleared', async () => {
    vi.useFakeTimers();
    try {
      const { ctx, output } = setup();
      ctx.state = 'suspended';
      const playing = output.play(pcm([0.1]));
      await vi.advanceTimersByTimeAsync(0);
      expect(vi.getTimerCount()).toBe(0);
      ctx.sources[0]?.finish();
      await expect(playing).resolves.toEqual(ok(undefined));
    } finally {
      vi.useRealTimers();
    }
  });

  it('uses the browser AudioContext when there is one', async () => {
    expect(createBrowserAudioOutput().supported).toBe(false);
    const ctx = new FakeContext();
    vi.stubGlobal(
      'AudioContext',
      vi.fn(function AudioContext() {
        return ctx;
      }),
    );
    const output = createBrowserAudioOutput();
    expect(output.supported).toBe(true);
    const playing = output.play(pcm([0]));
    await settle();
    ctx.sources[0]?.finish();
    await expect(playing).resolves.toEqual(ok(undefined));
  });
});

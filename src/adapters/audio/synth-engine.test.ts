import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it, vi } from 'vitest';

import { createSynthEngine } from './synth-engine';
import type { SynthDeps, SynthSession } from './synth-engine';
import { VOICE } from './voice';
import { err } from '../../domain/result';

const CONFIG = readFileSync(
  join(import.meta.dirname, '..', '..', 'assets', 'voice', VOICE.config.name),
  'utf8',
);
const MODEL = new Uint8Array(10).fill(7);
const URLS = { modelUrl: 'https://x/voice/model.onnx', configUrl: 'https://x/assets/config.json' };

/** A response that streams `bytes` in chunks of `size`. */
const streamed = (bytes: Uint8Array, size: number) =>
  new Response(
    new ReadableStream<Uint8Array>({
      start(controller) {
        for (let i = 0; i < bytes.length; i += size) controller.enqueue(bytes.slice(i, i + size));
        controller.close();
      },
    }),
  );

const fakeCache = () => {
  const entries = new Map<string, Response>();
  return {
    entries,
    match: (url: string) => Promise.resolve(entries.get(url)?.clone()),
    put: (url: string, response: Response) => {
      entries.set(url, response);
      return Promise.resolve();
    },
  };
};

const setup = (overrides: Partial<SynthDeps> = {}) => {
  const run = vi.fn<SynthSession['run']>(() => Promise.resolve(new Float32Array([0.1, -0.1])));
  const createSession = vi.fn<SynthDeps['createSession']>(() => Promise.resolve({ run }));
  const fetch = vi.fn((url: string) =>
    Promise.resolve(url === URLS.configUrl ? new Response(CONFIG) : streamed(MODEL, 4)),
  );
  const cache = fakeCache();
  const engine = createSynthEngine({
    fetch,
    openCache: () => Promise.resolve(cache),
    createSession,
    modelBytes: MODEL.length,
    ...overrides,
  });
  return { engine, fetch, createSession, run, cache };
};

describe('synthesis engine (M5.2)', () => {
  it('FR-31: loads the voice once, then speaks phoneme IDs with the voice’s scales', async () => {
    const { engine, fetch, createSession, run } = setup();
    const progress: number[] = [];
    const first = await engine.synthesise({ text: 'æ!', ...URLS }, (f) => progress.push(f));
    expect(first).toEqual({
      ok: true,
      value: { samples: new Float32Array([0.1, -0.1]), sampleRate: 22050 },
    });
    expect(createSession).toHaveBeenCalledWith(MODEL);
    // BOS PAD æ PAD ! PAD EOS, with Cori's IDs.
    expect(run).toHaveBeenCalledWith([1, 0, 39, 0, 4, 0, 2], [0.667, 1, 0.8]);
    expect(progress).toEqual([0.4, 0.8, 1]);

    await engine.synthesise({ text: 'æ!', ...URLS }, () => undefined);
    expect(createSession).toHaveBeenCalledTimes(1);
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it('FR-33: caches the model, and a fresh engine loads it from the cache', async () => {
    const first = setup();
    await first.engine.synthesise({ text: 'æ!', ...URLS }, () => undefined);
    expect(first.cache.entries.has(URLS.modelUrl)).toBe(true);

    const fetch = vi.fn((url: string) =>
      url === URLS.configUrl
        ? Promise.resolve(new Response(CONFIG))
        : Promise.reject(new TypeError('offline')),
    );
    const next = setup({ fetch, openCache: () => Promise.resolve(first.cache) });
    const progress: number[] = [];
    const result = await next.engine.synthesise({ text: 'æ!', ...URLS }, (f) => progress.push(f));
    expect(result.ok).toBe(true);
    expect(next.createSession).toHaveBeenCalledWith(MODEL);
    expect(progress).toEqual([1]);
  });

  it('works without a cache, and through a broken one', async () => {
    const none = setup({ openCache: () => Promise.resolve(undefined) });
    expect((await none.engine.synthesise({ text: 'æ!', ...URLS }, () => undefined)).ok).toBe(true);

    const broken = setup({
      openCache: () =>
        Promise.resolve({
          match: () => Promise.reject(new Error('corrupt')),
          put: () => Promise.reject(new Error('full')),
        }),
    });
    expect((await broken.engine.synthesise({ text: 'æ!', ...URLS }, () => undefined)).ok).toBe(
      true,
    );
  });

  it('reports a voice that fails to load, and retries on the next request', async () => {
    const loadFailed = err({ kind: 'audio-load-failed' });
    let modelStatus = 404;
    const fetch = vi.fn((url: string) =>
      Promise.resolve(
        url === URLS.configUrl
          ? new Response(CONFIG)
          : modelStatus === 200
            ? streamed(MODEL, 10)
            : new Response(null, { status: modelStatus }),
      ),
    );
    const { engine } = setup({ fetch });
    expect(await engine.synthesise({ text: 'æ!', ...URLS }, () => undefined)).toEqual(loadFailed);
    modelStatus = 200;
    expect((await engine.synthesise({ text: 'æ!', ...URLS }, () => undefined)).ok).toBe(true);
  });

  it('reports a missing or malformed config, and a model the runtime rejects', async () => {
    const loadFailed = err({ kind: 'audio-load-failed' });
    const missing = setup({ fetch: () => Promise.resolve(new Response(null, { status: 404 })) });
    expect(await missing.engine.synthesise({ text: 'æ!', ...URLS }, () => undefined)).toEqual(
      loadFailed,
    );
    const malformed = setup({ fetch: () => Promise.resolve(new Response('{"audio":1}')) });
    expect(await malformed.engine.synthesise({ text: 'æ!', ...URLS }, () => undefined)).toEqual(
      loadFailed,
    );
    const rejected = setup({ createSession: () => Promise.reject(new Error('bad model')) });
    expect(await rejected.engine.synthesise({ text: 'æ!', ...URLS }, () => undefined)).toEqual(
      loadFailed,
    );
  });

  it('reports text the voice can’t say, and a failed run', async () => {
    const { engine, run } = setup();
    expect(await engine.synthesise({ text: '☃!', ...URLS }, () => undefined)).toEqual(
      err({ kind: 'audio-unsupported' }),
    );
    run.mockRejectedValueOnce(new Error('oom'));
    expect(await engine.synthesise({ text: 'æ!', ...URLS }, () => undefined)).toEqual(
      err({ kind: 'audio-playback-failed' }),
    );
  });
});

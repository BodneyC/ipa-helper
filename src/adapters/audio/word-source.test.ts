import { describe, expect, it, vi } from 'vitest';

import type { SynthRequest } from './synth-protocol';
import { createWordSource } from './word-source';
import type { SynthWorker } from './word-source';
import { symbolId } from '../../domain/inventory/symbol-id';
import { err, ok } from '../../domain/result';
import { wordFromIds } from '../../domain/word/word';

const word = (...ids: string[]) => wordFromIds(ids.map(symbolId));
const URLS = { model: 'https://x/voice/m.onnx', config: 'https://x/assets/c.json' };

/** A stand-in worker the test answers by hand. */
const fakeWorker = () => {
  const messageListeners: ((event: MessageEvent<unknown>) => void)[] = [];
  const errorListeners: (() => void)[] = [];
  const requests: SynthRequest[] = [];
  const terminate = vi.fn();
  const worker: SynthWorker = {
    postMessage: (message: SynthRequest) => {
      requests.push(message);
    },
    addEventListener: (type: string, listener: (event: MessageEvent<unknown>) => void) => {
      if (type === 'message') messageListeners.push(listener);
      else
        errorListeners.push(() => {
          listener(new MessageEvent('error'));
        });
    },
    terminate,
  };
  const reply = (data: unknown) => {
    for (const listener of messageListeners) listener(new MessageEvent('message', { data }));
  };
  const crash = () => {
    for (const listener of errorListeners) listener();
  };
  return { worker, requests, reply, crash, terminate };
};

describe('word source (M5.2)', () => {
  it('FR-31, FR-33: starts the worker on the first word and sends it the voice text', async () => {
    const fake = fakeWorker();
    const createWorker = vi.fn(() => fake.worker);
    const source = createWordSource({ createWorker, urls: URLS });
    expect(createWorker).not.toHaveBeenCalled();

    const playing = source(word('primary-stress', 'k', 'ash', 't'));
    expect(fake.requests).toEqual([
      { type: 'synthesise', id: 1, text: 'kˈæt!', modelUrl: URLS.model, configUrl: URLS.config },
    ]);
    const samples = new Float32Array([0.5]);
    fake.reply({ type: 'audio', id: 1, samples, sampleRate: 22050 });
    await expect(playing).resolves.toEqual(ok({ kind: 'pcm', samples, sampleRate: 22050 }));

    void source(word('ash'));
    expect(createWorker).toHaveBeenCalledTimes(1);
    expect(fake.requests[1]?.id).toBe(2);
  });

  it('passes download progress to every waiting word, and ignores stray messages', async () => {
    const fake = fakeWorker();
    const source = createWordSource({ createWorker: () => fake.worker, urls: URLS });
    const a = vi.fn();
    const b = vi.fn();
    const first = source(word('ash'), a);
    const second = source(word('k'), b);
    fake.reply({ type: 'progress', fraction: 0.5 });
    fake.reply({ type: 'audio', id: 99, samples: new Float32Array(1), sampleRate: 1 });
    fake.reply('noise');
    expect(a).toHaveBeenCalledWith(0.5);
    expect(b).toHaveBeenCalledWith(0.5);
    fake.reply({ type: 'error', id: 1, kind: 'audio-load-failed' });
    fake.reply({ type: 'error', id: 2, kind: 'audio-playback-failed' });
    await expect(first).resolves.toEqual(err({ kind: 'audio-load-failed' }));
    await expect(second).resolves.toEqual(err({ kind: 'audio-playback-failed' }));
  });

  it('says nothing for a word with no sound, without starting the worker', async () => {
    const createWorker = vi.fn(() => fakeWorker().worker);
    const source = createWordSource({ createWorker, urls: URLS });
    await expect(source(word('primary-stress'))).resolves.toEqual(
      err({ kind: 'audio-unsupported' }),
    );
    expect(createWorker).not.toHaveBeenCalled();
  });

  it('fails every waiting word when the worker crashes, and starts a new one next time', async () => {
    const first = fakeWorker();
    const second = fakeWorker();
    const createWorker = vi
      .fn()
      .mockReturnValueOnce(first.worker)
      .mockReturnValueOnce(second.worker);
    const source = createWordSource({ createWorker, urls: URLS });
    const waiting = source(word('ash'));
    first.crash();
    await expect(waiting).resolves.toEqual(err({ kind: 'audio-load-failed' }));
    expect(first.terminate).toHaveBeenCalled();
    void source(word('ash'));
    expect(second.requests).toHaveLength(1);
  });

  it('defaults to absolute URLs on this page for the model and config', () => {
    const fake = fakeWorker();
    const source = createWordSource({ createWorker: () => fake.worker });
    void source(word('ash'));
    const [request] = fake.requests;
    expect(request?.modelUrl).toMatch(
      /^http:\/\/localhost(:\d+)?\/voice\/en_GB-cori-medium\.1899f98e\.onnx$/,
    );
    expect(request?.configUrl).toMatch(
      /^http:\/\/localhost(:\d+)?\/.*en_GB-cori-medium\.onnx.*\.json/,
    );
  });
});

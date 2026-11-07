import type { WordClip, WordSource } from './audio-player';
import { isSynthReply } from './synth-protocol';
import type { SynthRequest } from './synth-protocol';
import { VOICE } from './voice';
import configUrl from '../../assets/voice/en_GB-cori-medium.onnx.json?url';
import type { AudioError } from '../../domain/ports';
import { err, ok } from '../../domain/result';
import type { Result } from '../../domain/result';
import { piperPhonemeSerialiser } from '../../domain/serialise/piper';

/** The parts of a `Worker` the source uses. */
export interface SynthWorker {
  postMessage(message: SynthRequest): void;
  addEventListener(type: 'message', listener: (event: MessageEvent<unknown>) => void): void;
  addEventListener(type: 'error', listener: () => void): void;
  terminate(): void;
}

interface WordSourceOptions {
  readonly createWorker?: () => SynthWorker;
  /** Absolute URLs of the model and its config. */
  readonly urls?: { readonly model: string; readonly config: string };
}

interface Pending {
  readonly resolve: (result: Result<WordClip, AudioError>) => void;
  readonly onProgress: ((fraction: number) => void) | undefined;
}

const defaultUrls = () => ({
  model: new URL(`${import.meta.env.BASE_URL}voice/${VOICE.model.servedAs}`, location.href).href,
  config: new URL(configUrl, location.href).href,
});

const createSynthWorker = (): SynthWorker =>
  new Worker(new URL('./synth.worker.ts', import.meta.url), { type: 'module', name: 'synth' });

/**
 * Word synthesis (FR-31, M5.2): serialises the word for the voice, and has the
 * synthesis worker speak it. The worker starts on the first word, so its code,
 * the runtime and the 63.5 MB model all load only when asked for (FR-33). If
 * the worker crashes, every waiting word fails and the next word starts a new one.
 */
export const createWordSource = ({
  createWorker = createSynthWorker,
  urls,
}: WordSourceOptions = {}): WordSource => {
  let worker: SynthWorker | undefined;
  let nextId = 0;
  const pending = new Map<number, Pending>();

  const failAll = () => {
    for (const { resolve } of pending.values()) resolve(err({ kind: 'audio-load-failed' }));
    pending.clear();
    worker?.terminate();
    worker = undefined;
  };

  const start = (): SynthWorker => {
    const started = createWorker();
    started.addEventListener('message', (event: MessageEvent<unknown>) => {
      const reply = event.data;
      if (!isSynthReply(reply)) return;
      if (reply.type === 'progress') {
        for (const { onProgress } of pending.values()) onProgress?.(reply.fraction);
        return;
      }
      const waiting = pending.get(reply.id);
      if (waiting === undefined) return;
      pending.delete(reply.id);
      waiting.resolve(
        reply.type === 'audio'
          ? ok({
              clip: { kind: 'pcm', samples: reply.samples, sampleRate: reply.sampleRate },
              dropped: reply.dropped,
            })
          : err({ kind: reply.kind }),
      );
    });
    started.addEventListener('error', failAll);
    return started;
  };

  return (word, onProgress) => {
    const text = piperPhonemeSerialiser.serialise(word);
    if (text === '') return Promise.resolve(err({ kind: 'audio-unsupported' }));
    const { model, config } = urls ?? defaultUrls();
    worker ??= start();
    const id = (nextId += 1);
    const request: SynthRequest = {
      type: 'synthesise',
      id,
      text,
      modelUrl: model,
      configUrl: config,
    };
    return new Promise((resolve) => {
      pending.set(id, { resolve, onProgress });
      worker?.postMessage(request);
    });
  };
};

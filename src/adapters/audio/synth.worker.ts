// The synthesis worker (M5.2, ADR-0009): runs the Piper voice with
// onnxruntime-web off the main thread. Vite bundles it as its own chunk,
// loaded only when a word is first played.
// The wasm-only build: its bundle inlines the glue for the plain
// `ort-wasm-simd-threaded.wasm`. The default entry (WebGPU-capable since 1.2x)
// expects the 29.5 MB `.jsep.wasm` instead, and hangs if given this one.
import * as ort from 'onnxruntime-web/wasm';
// Self-hosted (NFR-6): an alias in vite.config.ts points at the package's dist
// folder, whose files its `exports` don't list.
import wasmUrl from 'onnxruntime-web-dist/ort-wasm-simd-threaded.wasm?url';

import { openAudioCache } from './cache';
import { createSynthEngine } from './synth-engine';
import { isSynthRequest } from './synth-protocol';
import type { SynthReply } from './synth-protocol';
import { VOICE } from './voice';

// GitHub Pages can't send COOP/COEP, so there is no SharedArrayBuffer and so
// only one thread (ADR-0010). The default bundle inlines the wasm glue code.
ort.env.wasm.numThreads = 1;
ort.env.wasm.wasmPaths = { wasm: wasmUrl };

const engine = createSynthEngine({
  fetch: (url) => fetch(url),
  openCache: openAudioCache,
  modelBytes: VOICE.model.bytes,
  createSession: async (model) => {
    const session = await ort.InferenceSession.create(model, { executionProviders: ['wasm'] });
    return {
      run: async (ids, scales) => {
        const out = await session.run({
          input: new ort.Tensor('int64', BigInt64Array.from(ids, BigInt), [1, ids.length]),
          input_lengths: new ort.Tensor('int64', BigInt64Array.of(BigInt(ids.length)), [1]),
          scales: new ort.Tensor('float32', Float32Array.from(scales), [3]),
        });
        const data = out['output']?.data;
        if (!(data instanceof Float32Array)) throw new Error('voice: no float32 output');
        return data;
      },
    };
  },
});

const post = (reply: SynthReply, transfer: Transferable[] = []) => {
  self.postMessage(reply, { transfer });
};

self.addEventListener('message', (event: MessageEvent<unknown>) => {
  const request = event.data;
  if (!isSynthRequest(request)) return;
  void engine
    .synthesise(request, (fraction) => {
      post({ type: 'progress', fraction });
    })
    .then((result) => {
      if (result.ok) {
        const { samples, sampleRate } = result.value;
        post({ type: 'audio', id: request.id, samples, sampleRate }, [samples.buffer]);
      } else {
        post({ type: 'error', id: request.id, kind: result.error.kind });
      }
    });
});

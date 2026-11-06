import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

const read = (path: string) => readFileSync(new URL(`../../${path}`, import.meta.url), 'utf8');

/** The quoted module specifiers the synthesis worker imports. */
const workerImports = (): string[] =>
  [...read('src/adapters/audio/synth.worker.ts').matchAll(/^import .* from '([^']+)';$/gm)].map(
    ([, specifier = '']) => specifier,
  );

describe('onnxruntime-web in the synthesis worker (ADR-0009)', () => {
  it('imports the wasm-only build and self-hosts the plain wasm binary', () => {
    expect(workerImports()).toEqual(
      expect.arrayContaining([
        'onnxruntime-web/wasm',
        'onnxruntime-web-dist/ort-wasm-simd-threaded.wasm?url',
      ]),
    );
  });

  // The default bundle switched to the 29.5 MB `.jsep.wasm` (1.20 → 1.31) and
  // hung when handed the plain binary. e2e mocks the worker, so only this catches it.
  it('uses a bundle whose inlined glue expects that same binary', () => {
    const bundle = read('node_modules/onnxruntime-web/dist/ort.wasm.bundle.min.mjs');
    const binaries = new Set(bundle.match(/ort-wasm-simd-threaded[\w.]*\.wasm/g));
    expect(binaries).toEqual(new Set(['ort-wasm-simd-threaded.wasm']));
  });
});

import fc from 'fast-check';
import { describe, expect, it } from 'vitest';

import {
  isCachedOnUse,
  isPrecached,
  isSkipWaiting,
  parsePrecacheManifest,
  route,
  selectPrecache,
  shellCacheName,
  SKIP_WAITING,
} from './rules';

/** What `vite build` writes to dist/ today (M7.1), plus the PWA files. */
const DIST = [
  'index.html',
  'sw.js',
  'sw.js.map',
  'manifest.webmanifest',
  'assets/index-DNuR-HYF.js',
  'assets/index-DNuR-HYF.js.map',
  'assets/index-DLnD1vUv.css',
  'assets/synth.worker-o5qG05OW.js',
  'assets/ort-wasm-simd-threaded-BQQNiIPt.wasm',
  'assets/en_GB-cori-medium.onnx-DOS0WhUJ.json',
  'assets/schwa-30xt4TGm.opus',
  'fonts/ipa-helper-ipa.woff2',
  'fonts/jetbrains-mono-ascii.woff2',
  'fonts/OFL-CharisSIL.txt',
  'icons/icon-192.png',
  'icons/icon-512.png',
  'icons/icon-maskable-512.png',
  'voice/en_GB-cori-medium.1899f98e.onnx',
];

describe('selectPrecache (FR-61)', () => {
  it('picks the app shell: page, manifest, entry JS and CSS, fonts and icons, sorted', () => {
    expect(selectPrecache(DIST)).toEqual([
      'assets/index-DLnD1vUv.css',
      'assets/index-DNuR-HYF.js',
      'fonts/ipa-helper-ipa.woff2',
      'fonts/jetbrains-mono-ascii.woff2',
      'icons/icon-192.png',
      'icons/icon-512.png',
      'icons/icon-maskable-512.png',
      'index.html',
      'manifest.webmanifest',
    ]);
  });

  it.each([
    'sw.js',
    'sw.js.map',
    'assets/index-DNuR-HYF.js.map',
    'assets/synth.worker-o5qG05OW.js',
    'assets/ort-wasm-simd-threaded-BQQNiIPt.wasm',
    'assets/schwa-30xt4TGm.opus',
    'fonts/OFL-CharisSIL.txt',
    'voice/en_GB-cori-medium.1899f98e.onnx',
  ])('leaves out %s: lazy audio (FR-33), maps, licences and the worker itself', (path) => {
    expect(isPrecached(path)).toBe(false);
  });
});

describe('isCachedOnUse (FR-61, FR-33)', () => {
  it('covers the lazy word-audio files: worker script, wasm and voice config', () => {
    expect(isCachedOnUse('assets/synth.worker-o5qG05OW.js')).toBe(true);
    expect(isCachedOnUse('assets/ort-wasm-simd-threaded-BQQNiIPt.wasm')).toBe(true);
    expect(isCachedOnUse('assets/en_GB-cori-medium.onnx-DOS0WhUJ.json')).toBe(true);
  });

  it('leaves clips and the model to the audio cache, and skips maps and precached files', () => {
    expect(isCachedOnUse('assets/schwa-30xt4TGm.opus')).toBe(false);
    expect(isCachedOnUse('voice/en_GB-cori-medium.1899f98e.onnx')).toBe(false);
    expect(isCachedOnUse('assets/index-DNuR-HYF.js.map')).toBe(false);
    expect(isCachedOnUse('assets/index-DNuR-HYF.js')).toBe(false);
    expect(isCachedOnUse('assets/nested/thing.js')).toBe(false);
  });

  it('never overlaps the precache', () => {
    fc.assert(
      fc.property(fc.constantFrom(...DIST), fc.string(), (base, suffix) => {
        const path = base + suffix;
        expect(isPrecached(path) && isCachedOnUse(path)).toBe(false);
      }),
    );
  });
});

describe('route (ADR-0013)', () => {
  const scope = 'https://example.org/ipa-helper/';
  const precached = new Set(['index.html', 'assets/index-a.js']);
  const get = (url: string, mode = 'cors') => route({ url, method: 'GET', mode }, scope, precached);

  it('answers every navigation in scope with the cached page', () => {
    const page = { kind: 'precache', key: `${scope}index.html` };
    expect(get(scope, 'navigate')).toEqual(page);
    expect(get(`${scope}?x=1#w=1:theta`, 'navigate')).toEqual(page);
    expect(get(`${scope}anything/else`, 'navigate')).toEqual(page);
  });

  it('serves precached files by URL without their query', () => {
    expect(get(`${scope}assets/index-a.js?v=2`)).toEqual({
      kind: 'precache',
      key: `${scope}assets/index-a.js`,
    });
  });

  it('caches lazy build files on first use', () => {
    expect(get(`${scope}assets/synth.worker-b.js`)).toEqual({
      kind: 'on-use',
      key: `${scope}assets/synth.worker-b.js`,
    });
  });

  it('leaves the browser to fetch everything else', () => {
    const network = { kind: 'network' };
    expect(get(`${scope}assets/schwa-c.opus`)).toEqual(network);
    expect(get(`${scope}voice/model.onnx`)).toEqual(network);
    expect(get(`${scope}sw.js`)).toEqual(network);
    expect(get('https://example.org/other/', 'navigate')).toEqual(network);
    expect(get('https://elsewhere.example/ipa-helper/index.html')).toEqual(network);
    expect(
      route({ url: `${scope}index.html`, method: 'POST', mode: 'cors' }, scope, precached),
    ).toEqual(network);
  });
});

describe('parsePrecacheManifest', () => {
  it('reads what the build injects', () => {
    expect(parsePrecacheManifest('{"version":"abc","paths":["index.html"]}')).toEqual({
      version: 'abc',
      paths: ['index.html'],
    });
  });

  it.each([
    '__IPA_HELPER_PRECACHE_MANIFEST__',
    'null',
    '[]',
    '{"paths":[]}',
    '{"version":"","paths":[]}',
    '{"version":1,"paths":[]}',
    '{"version":"v","paths":"index.html"}',
    '{"version":"v","paths":[1]}',
  ])('rejects %s, including the un-replaced placeholder', (json) => {
    expect(parsePrecacheManifest(json)).toBeUndefined();
  });
});

describe('the skip-waiting message (FR-62)', () => {
  it('is recognised, and nothing else is', () => {
    expect(isSkipWaiting(SKIP_WAITING)).toBe(true);
    expect(isSkipWaiting({ type: 'other' })).toBe(false);
    expect(isSkipWaiting('skip-waiting')).toBe(false);
    expect(isSkipWaiting(null)).toBe(false);
    expect(isSkipWaiting({})).toBe(false);
  });
});

describe('shellCacheName', () => {
  it('is versioned under the shell prefix', () => {
    expect(shellCacheName('1a2b')).toBe('ipa-helper-shell-1a2b');
  });
});

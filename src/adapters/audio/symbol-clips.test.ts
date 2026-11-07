import { createHash } from 'node:crypto';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it, vi } from 'vitest';

import { clipUrls, createSymbolClipSource, SYMBOL_CLIP_IDS } from './symbol-clips';
import { isSounding, SYMBOLS, symbolsIn } from '../../domain/inventory/index';
import { symbolId } from '../../domain/inventory/symbol-id';
import { err, ok } from '../../domain/result';

const P = symbolId('p');
const URLS = new Map([[P, '/assets/p-abc123.opus']]);
const bytes = () => new Uint8Array([79, 103, 103, 83]);

/** An in-memory stand-in for one Cache API store. */
const fakeCache = () => {
  const entries = new Map<string, Response>();
  return {
    entries,
    match: vi.fn((url: string) => Promise.resolve(entries.get(url)?.clone())),
    put: vi.fn((url: string, response: Response) => {
      entries.set(url, response);
      return Promise.resolve();
    }),
  };
};

const encoded = (data: Uint8Array) => ok({ kind: 'encoded' as const, data: data.buffer });

describe('symbol clip source', () => {
  it('FR-33: fetches a clip only when first asked, then reuses it for the visit', async () => {
    const fetchClip = vi.fn(() => Promise.resolve(new Response(bytes())));
    const source = createSymbolClipSource({
      urls: URLS,
      fetchClip,
      openCache: () => Promise.resolve(undefined),
    });
    expect(fetchClip).not.toHaveBeenCalled();
    await expect(source(P)).resolves.toEqual(encoded(bytes()));
    await source(P);
    expect(fetchClip).toHaveBeenCalledTimes(1);
    expect(fetchClip).toHaveBeenCalledWith('/assets/p-abc123.opus');
  });

  it('FR-33: stores fetched clips in the Cache API and plays them from there next visit', async () => {
    const cache = fakeCache();
    const fetchClip = vi.fn(() => Promise.resolve(new Response(bytes())));
    const first = createSymbolClipSource({
      urls: URLS,
      fetchClip,
      openCache: () => Promise.resolve(cache),
    });
    await first(P);
    expect(cache.entries.has('/assets/p-abc123.opus')).toBe(true);

    const offline = vi.fn(() => Promise.reject(new TypeError('offline')));
    const next = createSymbolClipSource({
      urls: URLS,
      fetchClip: offline,
      openCache: () => Promise.resolve(cache),
    });
    await expect(next(P)).resolves.toEqual(encoded(bytes()));
    expect(offline).not.toHaveBeenCalled();
  });

  it('ADR-0012, #14: has a committed clip for every sounding symbol, RP and full IPA, and nothing else', () => {
    // No full-IPA sound is listed as one the voice can't produce (ADR-0012), so all have clips.
    const sounding = SYMBOLS.filter(isSounding).map((s) => s.id);
    expect([...SYMBOL_CLIP_IDS].toSorted()).toEqual(sounding.toSorted());
  });

  it('reports symbols without a clip as unsupported', async () => {
    const source = createSymbolClipSource({
      urls: URLS,
      openCache: () => Promise.resolve(undefined),
    });
    await expect(source(symbolId('primary-stress'))).resolves.toEqual(
      err({ kind: 'audio-unsupported' }),
    );
  });

  it('reports failed fetches, and retries them on the next request', async () => {
    const fetchClip = vi
      .fn<(url: string) => Promise<Response>>()
      .mockRejectedValueOnce(new TypeError('offline'))
      .mockResolvedValueOnce(new Response(null, { status: 404 }))
      .mockResolvedValueOnce(new Response(bytes()));
    const source = createSymbolClipSource({
      urls: URLS,
      fetchClip,
      openCache: () => Promise.resolve(undefined),
    });
    const failed = err({ kind: 'audio-load-failed' });
    await expect(source(P)).resolves.toEqual(failed);
    await expect(source(P)).resolves.toEqual(failed);
    await expect(source(P)).resolves.toEqual(encoded(bytes()));
  });

  it('treats a broken cache as a miss, and a refused write as harmless', async () => {
    const cache = {
      match: () => Promise.reject(new Error('corrupt')),
      put: () => Promise.reject(new DOMException('full', 'QuotaExceededError')),
    };
    const fetchClip = () => Promise.resolve(new Response(bytes()));
    const source = createSymbolClipSource({
      urls: URLS,
      fetchClip,
      openCache: () => Promise.resolve(cache),
    });
    await expect(source(P)).resolves.toEqual(encoded(bytes()));
  });

  it('opens the browser cache by default, and does without it when it is missing or refused', async () => {
    const fetchClip = () => Promise.resolve(new Response(bytes()));
    await expect(createSymbolClipSource({ urls: URLS, fetchClip })(P)).resolves.toEqual(
      encoded(bytes()),
    );

    const cache = fakeCache();
    vi.stubGlobal('caches', { open: () => Promise.resolve(cache) });
    await createSymbolClipSource({ urls: URLS, fetchClip })(P);
    expect(cache.put).toHaveBeenCalled();

    vi.stubGlobal('caches', {
      open: () => Promise.reject(new DOMException('no', 'SecurityError')),
    });
    await expect(createSymbolClipSource({ urls: URLS, fetchClip })(P)).resolves.toEqual(
      encoded(bytes()),
    );
  });

  it('maps clip file paths to symbol IDs, ignoring anything else', () => {
    expect(
      clipUrls({
        '../../assets/audio/symbols/esh.opus': '/a/esh-1.opus',
        '../../assets/audio/symbols/Not An Id.opus': '/a/x.opus',
        '../../assets/audio/symbols/readme.txt': '/a/readme.txt',
      }),
    ).toEqual(new Map([[symbolId('esh'), '/a/esh-1.opus']]));
  });
});

// The committed clips (M4.3) and their manifest. This is CI's check that the
// clips are complete and are the bytes the maintainer picked; CI never re-renders.
describe('committed symbol clips', () => {
  const dir = join(import.meta.dirname, '..', '..', 'assets', 'audio', 'symbols');
  const manifest: unknown = JSON.parse(readFileSync(join(dir, 'manifest.json'), 'utf8'));
  const clips =
    typeof manifest === 'object' && manifest !== null && 'clips' in manifest
      ? manifest.clips
      : undefined;
  const entries: [string, unknown][] =
    typeof clips === 'object' && clips !== null ? Object.entries(clips) : [];
  const sounding = symbolsIn('rp')
    .filter(isSounding)
    .map((s) => s.id);
  const soundingAnywhere = new Set<string>(SYMBOLS.filter(isSounding).map((s) => s.id));

  it('FR-30: has a clip for every sounding RP symbol, and clips only for sounding symbols', () => {
    const ids = entries.map(([id]) => id);
    expect(sounding.filter((id) => !ids.includes(id))).toEqual([]);
    // Full-IPA sounds have clips where the voice can produce them (#14, ADR-0012).
    expect(ids.filter((id) => !soundingAnywhere.has(id))).toEqual([]);
  });

  it('has a manifest entry for every clip file, and a file for every entry', () => {
    const files = readdirSync(dir).filter((f) => f.endsWith('.opus'));
    expect(files.sort()).toEqual(entries.map(([id]) => `${id}.opus`).sort());
  });

  it('matches every clip to the SHA-256 the manifest recorded', () => {
    for (const [id, entry] of entries) {
      const recorded: unknown =
        typeof entry === 'object' && entry !== null && 'sha256' in entry ? entry.sha256 : undefined;
      const actual = createHash('sha256')
        .update(readFileSync(join(dir, `${id}.opus`)))
        .digest('hex');
      expect({ id, sha256: actual }).toEqual({ id, sha256: recorded });
    }
  });

  it('FR-30: gives the app a clip URL for every sounding RP symbol', async () => {
    const fetchClip = vi.fn(() => Promise.resolve(new Response(bytes())));
    const source = createSymbolClipSource({
      fetchClip,
      openCache: () => Promise.resolve(undefined),
    });
    for (const id of sounding) {
      await expect(source(id).then((result) => ({ id, ok: result.ok }))).resolves.toEqual({
        id,
        ok: true,
      });
    }
  });
});

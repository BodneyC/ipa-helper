import type { ClipSource } from './audio-player';
import { openAudioCache } from './cache';
import type { AudioCache } from './cache';
import type { AudioClip } from './web-audio-output';
import { parseSymbolId } from '../../domain/inventory/symbol-id';
import type { SymbolId } from '../../domain/inventory/symbol-id';
import type { AudioError } from '../../domain/ports';
import { err, ok } from '../../domain/result';
import type { Result } from '../../domain/result';

/**
 * Maps glob results (`…/symbols/<symbol id>.opus` → URL) to symbol IDs. Files
 * whose name is not a symbol ID are ignored.
 */
export const clipUrls = (files: Readonly<Record<string, string>>): ReadonlyMap<SymbolId, string> =>
  new Map(
    Object.entries(files).flatMap(([path, url]) => {
      const name = /([^/]+)\.opus$/.exec(path)?.[1];
      const id = name === undefined ? undefined : parseSymbolId(name);
      return id?.ok === true ? [[id.value, url] as const] : [];
    }),
  );

// The clips committed by `pnpm audio:select` (M4.3). Only their URLs are in
// the bundle: Vite fingerprints each file, and `no-inline` stops it from
// inlining small clips as data URIs, so no audio loads until it is asked for.
const SYMBOL_CLIP_URLS = clipUrls(
  import.meta.glob<string>('../../assets/audio/symbols/*.opus', {
    query: '?url&no-inline',
    import: 'default',
    eager: true,
  }),
);

interface SymbolClipOptions {
  readonly urls?: ReadonlyMap<SymbolId, string>;
  readonly fetchClip?: (url: string) => Promise<Response>;
  readonly openCache?: () => Promise<AudioCache | undefined>;
}

/**
 * The symbol clip source (FR-30, FR-33): fetches a clip the first time it is
 * asked for, keeps it in memory for the visit, and stores it with the Cache
 * API so it plays offline later. A symbol without a clip (a suprasegmental
 * mark) is `audio-unsupported`; a failed fetch is forgotten so it can retry.
 */
export const createSymbolClipSource = ({
  urls = SYMBOL_CLIP_URLS,
  fetchClip = (url) => fetch(url),
  openCache = openAudioCache,
}: SymbolClipOptions = {}): ClipSource<SymbolId> => {
  const loaded = new Map<SymbolId, Promise<Result<AudioClip, AudioError>>>();
  let cache: Promise<AudioCache | undefined> | undefined;

  const load = async (url: string): Promise<Result<AudioClip, AudioError>> => {
    const store = await (cache ??= openCache());
    try {
      const cached = await store?.match(url);
      if (cached !== undefined) return ok({ kind: 'encoded', data: await cached.arrayBuffer() });
    } catch {
      // A broken cache is only a missed shortcut: fall through to the network.
    }
    let response: Response;
    let data: ArrayBuffer;
    try {
      response = await fetchClip(url);
      if (!response.ok) return err({ kind: 'audio-load-failed' });
      data = await response.clone().arrayBuffer();
    } catch {
      return err({ kind: 'audio-load-failed' });
    }
    // Caching is best effort: quota or private mode must not stop playback.
    await store?.put(url, response).catch(() => undefined);
    return ok({ kind: 'encoded', data });
  };

  return (id) => {
    const url = urls.get(id);
    if (url === undefined) return Promise.resolve(err({ kind: 'audio-unsupported' }));
    const existing = loaded.get(id);
    if (existing !== undefined) return existing;
    const loading = load(url).then((result) => {
      if (!result.ok) loaded.delete(id);
      return result;
    });
    loaded.set(id, loading);
    return loading;
  };
};

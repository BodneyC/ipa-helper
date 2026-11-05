import { route, SHELL_CACHE_PREFIX, shellCacheName } from './rules';
import type { PrecacheManifest } from './rules';

/** The slice of a `Cache` the worker uses. */
export interface ShellCache {
  match(key: string): Promise<Response | undefined>;
  put(key: string, response: Response): Promise<void>;
  addAll(requests: readonly Request[]): Promise<void>;
}

/** The slice of `CacheStorage` the worker uses. */
export interface ShellCaches {
  open(name: string): Promise<ShellCache>;
  keys(): Promise<readonly string[]>;
  delete(name: string): Promise<boolean>;
}

interface ShellWorkerDeps {
  readonly manifest: PrecacheManifest;
  /** The registration scope: an absolute URL ending in `/`. */
  readonly scope: string;
  readonly caches: ShellCaches;
  readonly fetch: (request: Request) => Promise<Response>;
}

/** The worker's event handlers (ADR-0013). `sw.ts` wires them to `self`. */
interface ShellWorker {
  /** Precaches the app shell. Rejects (failing the install) if any file is missing. */
  install(): Promise<void>;
  /** Deletes older shell caches. Other caches, such as the audio cache, are kept. */
  activate(): Promise<void>;
  /** A response for the request, or `undefined` to let the browser fetch it. */
  respond(request: Request): Promise<Response> | undefined;
}

export const createShellWorker = ({
  manifest,
  scope,
  caches,
  fetch,
}: ShellWorkerDeps): ShellWorker => {
  const cacheName = shellCacheName(manifest.version);
  const precached = new Set(manifest.paths);

  /** Cache first; on a miss, the network. A good network response is stored when `store`. */
  const fromCache = async (key: string, request: Request, store: boolean): Promise<Response> => {
    const cache = await caches.open(cacheName);
    const hit = await cache.match(key);
    if (hit !== undefined) return hit;
    const response = await fetch(request);
    if (store && response.ok) await cache.put(key, response.clone());
    return response;
  };

  return {
    install: async () => {
      const cache = await caches.open(cacheName);
      // `reload` skips the HTTP cache, so a stale copy can't end up in the shell.
      await cache.addAll(
        manifest.paths.map((path) => new Request(new URL(path, scope), { cache: 'reload' })),
      );
    },

    activate: async () => {
      const names = await caches.keys();
      await Promise.all(
        names
          .filter((name) => name.startsWith(SHELL_CACHE_PREFIX) && name !== cacheName)
          .map((name) => caches.delete(name)),
      );
    },

    respond: (request) => {
      const target = route(request, scope, precached);
      switch (target.kind) {
        case 'network':
          return undefined;
        case 'precache':
          return fromCache(target.key, request, false);
        case 'on-use':
          return fromCache(target.key, request, true);
      }
    },
  };
};

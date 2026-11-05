/**
 * The service worker's caching rules (ADR-0013, FR-61). Pure: the build plugin
 * uses them to choose what to precache, and the worker uses them to route
 * requests. Paths are relative to the worker's scope, e.g. `assets/index-abc.js`.
 */

/** What the build injects into `sw.js`: a version, and the files to precache. */
export interface PrecacheManifest {
  /** Changes whenever any precached file changes. */
  readonly version: string;
  readonly paths: readonly string[];
}

/** Caches the worker owns. Every other cache (e.g. the audio adapters') is left alone. */
export const SHELL_CACHE_PREFIX = 'ipa-helper-shell-';

export const shellCacheName = (version: string): string => `${SHELL_CACHE_PREFIX}${version}`;

/** The page itself: every navigation inside the scope is answered with it. */
const SHELL_PAGE = 'index.html';

/** The worker script. It never caches itself. */
export const WORKER_SCRIPT = 'sw.js';

/** The synthesis worker loads only when a word is first played (FR-33). */
const LAZY_SCRIPT = /^assets\/synth\.worker-[\w-]+\.js$/;

/**
 * Whether a build file is part of the app shell, so it is fetched on install:
 * the page, manifest, entry scripts and styles, fonts and icons.
 */
export const isPrecached = (path: string): boolean =>
  path === SHELL_PAGE ||
  path === 'manifest.webmanifest' ||
  (/^assets\/[^/]+\.(?:js|css)$/.test(path) && !LAZY_SCRIPT.test(path)) ||
  /^fonts\/[^/]+\.woff2$/.test(path) ||
  /^icons\/[^/]+\.png$/.test(path);

/**
 * Whether a file is cached the first time it is fetched: fingerprinted build
 * files that load lazily, such as the synthesis worker, its `.wasm` and the voice
 * config. Symbol clips (`.opus`) and the voice model are left to the audio
 * adapters' own cache (ARCHITECTURE §8), and source maps are never cached.
 */
export const isCachedOnUse = (path: string): boolean =>
  /^assets\/[^/]+$/.test(path) && !isPrecached(path) && !/\.(?:opus|map)$/.test(path);

/** The build files to precache, sorted so the manifest is deterministic. */
export const selectPrecache = (paths: readonly string[]): readonly string[] =>
  paths.filter(isPrecached).toSorted();

/** The parts of a `Request` that routing looks at. */
export interface RouteRequest {
  readonly url: string;
  readonly method: string;
  readonly mode: string;
}

/**
 * How the worker answers a request. `precache` and `on-use` carry the cache key:
 * an absolute URL with no query or fragment. `network` means the worker does not
 * respond at all, so the browser fetches the request as if no worker were there.
 */
export type Route =
  | { readonly kind: 'precache'; readonly key: string }
  | { readonly kind: 'on-use'; readonly key: string }
  | { readonly kind: 'network' };

const NETWORK: Route = { kind: 'network' };

/**
 * Routes a request. `scope` is the registration scope, an absolute URL ending in
 * `/`. `precached` is the set of paths in the manifest.
 */
export const route = (
  request: RouteRequest,
  scope: string,
  precached: ReadonlySet<string>,
): Route => {
  if (request.method !== 'GET') return NETWORK;
  const url = new URL(request.url);
  url.search = '';
  url.hash = '';
  if (!url.href.startsWith(scope)) return NETWORK;
  if (request.mode === 'navigate')
    return { kind: 'precache', key: new URL(SHELL_PAGE, scope).href };
  const path = url.href.slice(scope.length);
  if (precached.has(path)) return { kind: 'precache', key: url.href };
  if (isCachedOnUse(path)) return { kind: 'on-use', key: url.href };
  return NETWORK;
};

const isStringArray = (value: unknown): value is readonly string[] =>
  Array.isArray(value) && value.every((item) => typeof item === 'string');

/** Reads the manifest the build injected, which reaches the worker as JSON text. */
export const parsePrecacheManifest = (json: string): PrecacheManifest | undefined => {
  let value: unknown;
  try {
    value = JSON.parse(json);
  } catch {
    return undefined;
  }
  if (typeof value !== 'object' || value === null || !('version' in value) || !('paths' in value))
    return undefined;
  const { version, paths } = value;
  if (typeof version !== 'string' || version === '') return undefined;
  if (!isStringArray(paths)) return undefined;
  return { version, paths };
};

/** The message the page posts to a waiting worker to make it take over (FR-62). */
export const SKIP_WAITING = { type: 'skip-waiting' } as const;

export const isSkipWaiting = (data: unknown): boolean =>
  typeof data === 'object' && data !== null && 'type' in data && data.type === SKIP_WAITING.type;

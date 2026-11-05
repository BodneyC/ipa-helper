/**
 * The service worker entry (ADR-0013). The build emits it as a classic script,
 * `dist/sw.js`, and replaces the placeholder below with the precache manifest.
 * The behaviour lives in `shell-worker.ts`; this file only wires it to `self`.
 */
import { isSkipWaiting, parsePrecacheManifest } from './rules';
import { createShellWorker } from './shell-worker';

declare const self: ServiceWorkerGlobalScope;

const manifest = parsePrecacheManifest('__IPA_HELPER_PRECACHE_MANIFEST__');
if (manifest === undefined) throw new Error('sw: the build did not inject a precache manifest');

const worker = createShellWorker({
  manifest,
  scope: self.registration.scope,
  caches: {
    open: (name) => self.caches.open(name),
    keys: () => self.caches.keys(),
    delete: (name) => self.caches.delete(name),
  },
  fetch: (request) => fetch(request),
});

self.addEventListener('install', (event) => {
  event.waitUntil(worker.install());
});

self.addEventListener('activate', (event) => {
  // Claiming makes the first visit work offline without a reload (FR-61).
  event.waitUntil(worker.activate().then(() => self.clients.claim()));
});

self.addEventListener('fetch', (event) => {
  const response = worker.respond(event.request);
  if (response !== undefined) event.respondWith(response);
});

self.addEventListener('message', (event) => {
  // Only the page's Reload button asks this (FR-62); a new worker never skips waiting by itself.
  if (isSkipWaiting(event.data)) event.waitUntil(self.skipWaiting());
});

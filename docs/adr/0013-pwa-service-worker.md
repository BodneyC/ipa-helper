# 0013. A hand-written service worker that precaches only the app shell

- Status: Accepted
- Date: 2026-11-05
- Relates to: NFR-5, NFR-6, FR-33, FR-60, FR-61, FR-62, ADR-0006, ADR-0009, ADR-0010

## Context
NFR-5 asks for an installable PWA that works offline (roadmap M7.1). The build is
small and has a single JS entry chunk. Audio is large and loaded lazily (FR-33):
the 63.5 MB voice model, an 11 MB onnxruntime `.wasm`, a 0.5 MB synthesis-worker
script and about 50 symbol clips. The audio adapters already store clips and the
model in their own Cache API store (`ipa-helper-audio-v1`). Nothing caches the
worker script, the `.wasm` or the voice config yet, so word audio can't work
offline even after first use.

The site runs from GitHub Pages at a sub-path (`BASE_PATH`, ADR-0010). Pages
can't set custom headers, and every asset except `public/` is fingerprinted.
E2E tests mock the synthesis worker with `page.route`. Playwright doesn't see
requests a service worker re-issues.

## Options considered
1. **`vite-plugin-pwa` (Workbox)**: + mature update and precache handling. −
   adds a dependency tree to the build. − Workbox's runtime routing would sit
   on top of the audio adapters' own cache. − its abstractions are larger than
   the five rules this app needs.
2. **Hand-written worker plus a small Vite plugin**: + no new dependencies, and
   the rules are pure functions under the same strict TypeScript and tests as
   everything else. + full control over what the worker touches. − the update
   flow, cache clean-up and build injection are ours to get right.
3. **No service worker, only a manifest**: − doesn't meet "works offline".

## Decision
We will write the service worker ourselves (option 2).

- **Source.** `src/sw/rules.ts` holds the pure rules: which build files to
  precache and how to route a request. `src/sw/shell-worker.ts` handles the
  install, activate, fetch and message events against injected `caches` and
  `fetch`. `src/sw/sw.ts` is the entry point and only wires those to `self`.
- **Build.** `scripts/pwa/plugin.ts` (build only):
  - emits `src/sw/sw.ts` as an extra entry chunk named `dist/sw.js`, with no
    hash and as a classic script (the build fails if the chunk contains
    `import` or `export`);
  - writes `manifest.webmanifest`, taking its colours from `tokens.css` so hex
    values stay in that file (ADR-0006);
  - after the bundle is written, lists `dist/`, picks the precache set with
    `rules.ts`, hashes those files' bytes into a version, and injects
    `{ version, urls }` into `sw.js`.
- **Precached on install:** `index.html`, the manifest, the entry JS and CSS,
  the font subsets and the icons, stored in `ipa-helper-shell-<version>` and
  fetched with `cache: 'reload'` so a stale HTTP cache can't poison them.
- **Cached on first use:** any other fingerprinted `assets/` file except
  `.opus` clips and source maps, cache-first in the same shell cache. That
  covers the synthesis worker, the `.wasm` and the voice config, so word audio
  works offline once it has played once. Symbol clips and the model stay with
  the audio adapters (`ipa-helper-audio-v1`), and the worker never touches them.
- **Fetch routing.** Only same-origin GETs inside the scope are handled.
  Navigations get the cached `index.html`, precached and runtime files come
  cache-first, and everything else is left to the browser (no `respondWith`).
- **Activate** deletes only older `ipa-helper-shell-*` caches, then claims
  clients, so the first visit is controlled without a reload.
- **Updates (FR-62).** A new worker waits. It never calls `skipWaiting` on its
  own, so an open tab never loses the files it was built with. The page adapter
  (`src/adapters/service-worker.ts`) reports a waiting worker through the
  `AppUpdates` port. The UI shows a notice, and **Reload** posts
  `{ type: 'skip-waiting' }` and reloads on `controllerchange`.
- **Registration** happens only in production builds (`import.meta.env.PROD`)
  and only where `navigator.serviceWorker` exists. Failures are silent: the app
  works without a worker.
- **Tests.** Playwright defaults to `serviceWorkers: 'block'` so existing
  `page.route` mocks keep working. `tests/e2e/pwa.spec.ts` opts back in to test
  install, offline and update.
- **Icons** are drawn by `scripts/pwa/render-icons.ts`: the schwa in the
  self-hosted IPA font on Gruvbox `dark0`, rendered with Playwright's Chromium
  (already a dev dependency). The PNGs are committed under `public/icons/`.

## Consequences
- No new dependencies. All SW logic is unit-tested with fake caches.
- After each deploy, the first word played re-downloads the worker script and
  `.wasm` (about 3.5 MB gzipped), because old shell caches are dropped. The
  63.5 MB model survives in the audio cache. If this hurts, move fingerprinted
  runtime files into a cache that isn't versioned and prune it by manifest.
- Browsers re-check `sw.js` on navigation, so an installed app that's never
  reloaded only sees updates on its next launch. Periodic `registration.update()`
  calls can be added if that proves too slow. *Update (#6): the adapter now
  calls `registration.update()` when the page becomes visible, at most once an
  hour (`UPDATE_CHECK_INTERVAL_MS`), ignoring failures.*
- If the app gains lazy-loaded JS chunks, they must be added to the precache rule
  in `rules.ts`, or they'll only work offline after first use.

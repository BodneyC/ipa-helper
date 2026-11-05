import { createHash } from 'node:crypto';
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

import type { Plugin } from 'vite';

import { colour, readPalette } from './palette';
import { selectPrecache, WORKER_SCRIPT } from '../../src/sw/rules';
import type { PrecacheManifest } from '../../src/sw/rules';

const WORKER_ENTRY = fileURLToPath(new URL('../../src/sw/sw.ts', import.meta.url));

/** The string in `src/sw/sw.ts` that the build replaces with the precache manifest. */
const PLACEHOLDER = /(["'`])__IPA_HELPER_PRECACHE_MANIFEST__\1/;

/** The icons `scripts/pwa/render-icons.ts` writes to `public/icons/`. */
const ICONS = [
  { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
  { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
  { src: 'icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
] as const;

/**
 * The web app manifest (FR-60). Every URL is relative to the manifest itself,
 * so the same file works at `/` and at a sub-path such as `/ipa-helper/` (ADR-0010).
 */
export const webManifest = (palette: ReadonlyMap<string, string>) => ({
  id: './',
  name: 'ipa-helper',
  short_name: 'ipa-helper',
  description:
    'Build IPA transcriptions of made-up words by clicking symbols, with TIPA LaTeX output.',
  lang: 'en-GB',
  dir: 'ltr',
  start_url: './',
  scope: './',
  display: 'standalone',
  background_color: colour(palette, 'gb-dark0'),
  theme_color: colour(palette, 'gb-dark0'),
  icons: ICONS,
});

/** Every file under `dir`, as `/`-separated paths relative to it. */
const listFiles = (dir: string): string[] =>
  readdirSync(dir, { recursive: true, withFileTypes: true })
    .filter((entry) => entry.isFile())
    .map((entry) => relative(dir, join(entry.parentPath, entry.name)).split(sep).join('/'));

/** The precache manifest for a built `dist/`: the shell files, versioned by their bytes. */
export const precacheManifest = (outDir: string): PrecacheManifest => {
  const paths = selectPrecache(listFiles(outDir));
  const hash = createHash('sha256');
  for (const path of paths) {
    hash
      .update(path)
      .update('\0')
      .update(readFileSync(join(outDir, path)))
      .update('\0');
  }
  return { version: hash.digest('hex').slice(0, 12), paths };
};

/** Puts the manifest into the worker's source, as a string literal it parses at start-up. */
export const injectManifest = (source: string, manifest: PrecacheManifest): string => {
  if (!PLACEHOLDER.test(source))
    throw new Error(`pwa: no manifest placeholder in ${WORKER_SCRIPT}`);
  const literal = JSON.stringify(JSON.stringify(manifest));
  return source.replace(PLACEHOLDER, () => literal);
};

/** Service workers registered as classic scripts can't use module syntax. */
export const assertClassicScript = (source: string): void => {
  if (/^\s*(?:import|export)\b/m.test(source)) {
    throw new Error(`pwa: ${WORKER_SCRIPT} must be a classic script, with no import or export`);
  }
};

/**
 * The PWA build (FR-60, FR-61, ADR-0013): emits `src/sw/sw.ts` as `sw.js`, writes
 * `manifest.webmanifest`, then injects the precache manifest into `sw.js`.
 */
export const pwaPlugin = (): Plugin => {
  let outDir = 'dist';
  return {
    name: 'ipa-helper:pwa',
    apply: 'build',
    configResolved: (config) => {
      outDir = join(config.root, config.build.outDir);
    },
    buildStart() {
      this.emitFile({ type: 'chunk', id: WORKER_ENTRY, fileName: WORKER_SCRIPT });
    },
    // The browser UI follows the page's theme; colours come from tokens.css (ADR-0006).
    transformIndexHtml: () => {
      const palette = readPalette();
      return [
        { scheme: 'dark', token: 'gb-dark0' },
        { scheme: 'light', token: 'gb-light0' },
      ].map(({ scheme, token }) => ({
        tag: 'meta',
        attrs: {
          name: 'theme-color',
          media: `(prefers-color-scheme: ${scheme})`,
          content: colour(palette, token),
        },
        injectTo: 'head' as const,
      }));
    },
    generateBundle() {
      this.emitFile({
        type: 'asset',
        fileName: 'manifest.webmanifest',
        source: `${JSON.stringify(webManifest(readPalette()), null, 2)}\n`,
      });
    },
    // After every file is on disk, so the precache version covers their final bytes.
    writeBundle: () => {
      const workerPath = join(outDir, WORKER_SCRIPT);
      const source = readFileSync(workerPath, 'utf8');
      assertClassicScript(source);
      writeFileSync(workerPath, injectManifest(source, precacheManifest(outDir)));
    },
  };
};

/** The cookie that makes the preview server act as if a new version were deployed. */
export const NEXT_DEPLOY_COOKIE = { name: 'ipa-helper-next-deploy', value: '1' } as const;

/**
 * `vite preview` only, for tests/e2e/pwa.spec.ts (FR-62). A request for `sw.js`
 * carrying {@link NEXT_DEPLOY_COOKIE} gets the built worker with a comment added.
 * Changing its bytes makes the browser install a new version. Playwright can't
 * route a service worker's own script request, and cookies are per browser
 * context, so parallel tests can't see each other's "deploys". It has no effect
 * on the build.
 */
export const nextDeployPreviewPlugin = (): Plugin => {
  let outDir = 'dist';
  return {
    name: 'ipa-helper:next-deploy-preview',
    apply: (_config, env) => env.isPreview === true,
    configResolved: (config) => {
      outDir = join(config.root, config.build.outDir);
    },
    configurePreviewServer: (server) => {
      server.middlewares.use((request, response, next) => {
        const path = new URL(request.url ?? '/', 'http://preview').pathname;
        if (
          !path.endsWith(`/${WORKER_SCRIPT}`) ||
          !request.headers.cookie?.includes(
            `${NEXT_DEPLOY_COOKIE.name}=${NEXT_DEPLOY_COOKIE.value}`,
          )
        ) {
          next();
          return;
        }
        response.setHeader('Content-Type', 'text/javascript');
        response.setHeader('Cache-Control', 'no-cache');
        response.end(`${readFileSync(join(outDir, WORKER_SCRIPT), 'utf8')}\n// next deploy\n`);
      });
    },
  };
};

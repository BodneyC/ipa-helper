import { StrictMode, startTransition } from 'react';
import { createRoot } from 'react-dom/client';

import { createAudioPlayer } from './adapters/audio/audio-player';
import { createSymbolClipSource, SYMBOL_CLIP_IDS } from './adapters/audio/symbol-clips';
import { createBrowserAudioOutput } from './adapters/audio/web-audio-output';
import { createWordSource } from './adapters/audio/word-source';
import { createBrowserClipboard } from './adapters/clipboard';
import { createDocumentTheme } from './adapters/document-theme';
import { createBrowserDownloads } from './adapters/downloads';
import { createLocalStore } from './adapters/local-storage';
import { createServiceWorkerUpdates } from './adapters/service-worker';
import { createUrlFragmentStore } from './adapters/url-hash';
import { App } from './app/App';
import { Providers } from './app/providers';
import { NULL_UPDATES } from './domain/ports';
import { loadSettings } from './state/settings';
import { readInitialWord } from './ui/features/word/UrlSync';
import './styles/tokens.css';
import './styles/themes.css';
import './styles/fonts.css';
import './styles/global.css';

const container = document.getElementById('root');
if (container === null) {
  throw new Error('ipa-helper: #root element is missing from index.html');
}

const services = {
  audio: createAudioPlayer({
    output: createBrowserAudioOutput(),
    symbols: createSymbolClipSource(),
    symbolIds: SYMBOL_CLIP_IDS,
    // Word synthesis runs in a worker (M5.2); without workers there's no word audio.
    words: typeof Worker === 'undefined' ? undefined : createWordSource(),
  }),
  clipboard: createBrowserClipboard(),
  downloads: createBrowserDownloads(),
  fragments: createUrlFragmentStore(),
  store: createLocalStore(),
  theme: createDocumentTheme(),
  // Offline support and updates (FR-61, FR-62, ADR-0013): production builds only,
  // so the dev server never serves a stale cached shell.
  updates:
    import.meta.env.PROD && 'serviceWorker' in navigator
      ? createServiceWorkerUpdates({
          container: navigator.serviceWorker,
          scriptUrl: `${import.meta.env.BASE_URL}sw.js`,
          scope: import.meta.env.BASE_URL,
        })
      : NULL_UPDATES,
};

const root = createRoot(container);
// NFR-3: the first render is a transition, so React renders the palette's
// hundred-odd keys in short slices instead of one long task that blocks input.
// It paints at the same time as a plain render; only the commit is one piece.
startTransition(() => {
  root.render(
    <StrictMode>
      <Providers
        services={services}
        initialWord={readInitialWord(services.fragments)}
        initialSettings={loadSettings(services.store)}
      >
        <App />
      </Providers>
    </StrictMode>,
  );
});

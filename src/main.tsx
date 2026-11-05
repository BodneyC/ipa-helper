import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import { createAudioPlayer } from './adapters/audio/audio-player';
import { createSymbolClipSource, SYMBOL_CLIP_IDS } from './adapters/audio/symbol-clips';
import { createBrowserAudioOutput } from './adapters/audio/web-audio-output';
import { createWordSource } from './adapters/audio/word-source';
import { createBrowserClipboard } from './adapters/clipboard';
import { createDocumentTheme } from './adapters/document-theme';
import { createLocalStore } from './adapters/local-storage';
import { createUrlFragmentStore } from './adapters/url-hash';
import { App } from './app/App';
import { Providers } from './app/providers';
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
  fragments: createUrlFragmentStore(),
  store: createLocalStore(),
  theme: createDocumentTheme(),
};

createRoot(container).render(
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

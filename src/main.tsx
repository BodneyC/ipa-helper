import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import { createAudioPlayer } from './adapters/audio/audio-player';
import { createBrowserAudioOutput } from './adapters/audio/web-audio-output';
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
  // Sources arrive with M4.3 (symbol clips) and M5.2 (word synthesis).
  audio: createAudioPlayer({ output: createBrowserAudioOutput() }),
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

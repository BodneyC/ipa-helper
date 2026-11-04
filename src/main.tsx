import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import { createBrowserClipboard } from './adapters/clipboard';
import { createUrlFragmentStore } from './adapters/url-hash';
import { App } from './app/App';
import { Providers } from './app/providers';
import { readInitialWord } from './ui/features/word/UrlSync';
import './styles/tokens.css';
import './styles/themes.css';
import './styles/fonts.css';
import './styles/global.css';

const container = document.getElementById('root');
if (container === null) {
  throw new Error('ipa-helper: #root element is missing from index.html');
}

const services = { clipboard: createBrowserClipboard(), fragments: createUrlFragmentStore() };

createRoot(container).render(
  <StrictMode>
    <Providers services={services} initialWord={readInitialWord(services.fragments)}>
      <App />
    </Providers>
  </StrictMode>,
);

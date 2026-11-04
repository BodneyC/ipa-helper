import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import { App } from './app/App';
import { Providers } from './app/providers';
import './styles/tokens.css';
import './styles/themes.css';
import './styles/global.css';

const container = document.getElementById('root');
if (container === null) {
  throw new Error('ipa-helper: #root element is missing from index.html');
}

createRoot(container).render(
  <StrictMode>
    <Providers>
      <App />
    </Providers>
  </StrictMode>,
);

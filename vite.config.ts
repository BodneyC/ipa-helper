import { fileURLToPath } from 'node:url';

import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

import { voiceModelPlugin } from './scripts/audio/dev-plugin';
import { nextDeployPreviewPlugin, pwaPlugin } from './scripts/pwa/plugin';

// BASE_PATH lets the same build serve from a sub-path such as /ipa-helper/ on
// GitHub Pages, or from the root (ADR-0010).
const base = process.env['BASE_PATH'] ?? '/';

export default defineConfig({
  base,
  plugins: [react(), pwaPlugin(), nextDeployPreviewPlugin(), voiceModelPlugin()],
  resolve: {
    alias: {
      // The synthesis worker self-hosts onnxruntime-web's wasm binary (NFR-6,
      // M5.2). The package's `exports` don't list its dist files, so alias the folder.
      'onnxruntime-web-dist': fileURLToPath(
        new URL('./node_modules/onnxruntime-web/dist', import.meta.url),
      ),
    },
  },
  worker: {
    // A module worker (`{ type: 'module' }`), so it can import like the app does.
    format: 'es',
  },
  build: {
    target: 'es2022',
    sourcemap: true,
  },
});

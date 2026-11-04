import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

// BASE_PATH lets the same build serve from a sub-path such as /ipa-helper/ on
// GitHub Pages, or from the root (ADR-0010).
const base = process.env['BASE_PATH'] ?? '/';

export default defineConfig({
  base,
  plugins: [react()],
  build: {
    target: 'es2022',
    sourcemap: true,
  },
});

import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

// Two environments (ADR-0005): plain Node for the pure layers, jsdom for anything
// that renders or touches browser APIs.
export default defineConfig({
  plugins: [react()],
  test: {
    restoreMocks: true,
    unstubGlobals: true,
    setupFiles: ['./tests/setup/fast-check.ts'],
    projects: [
      {
        extends: true,
        test: {
          name: 'node',
          environment: 'node',
          include: ['src/domain/**/*.test.ts', 'src/state/**/*.test.ts'],
        },
      },
      {
        extends: true,
        test: {
          name: 'jsdom',
          environment: 'jsdom',
          include: ['src/{app,ui,adapters}/**/*.test.{ts,tsx}'],
          setupFiles: ['./tests/setup/dom.ts'],
        },
      },
    ],
    coverage: {
      provider: 'v8',
      include: ['src/**/*.{ts,tsx}'],
      exclude: [
        'src/**/*.test.{ts,tsx}',
        // The composition root only wires real adapters into the DOM; e2e covers it.
        'src/main.tsx',
      ],
      reporter: ['text', 'html', 'lcov'],
      thresholds: {
        lines: 90,
        branches: 90,
        functions: 90,
        statements: 90,
        'src/domain/**': {
          lines: 100,
          branches: 100,
          functions: 100,
          statements: 100,
        },
      },
    },
  },
});

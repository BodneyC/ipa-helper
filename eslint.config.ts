import { fixupPluginRules } from '@eslint/compat';
import js from '@eslint/js';
import vitest from '@vitest/eslint-plugin';
import { defineConfig, globalIgnores } from 'eslint/config';
import prettier from 'eslint-config-prettier';
import { createNodeResolver, importX } from 'eslint-plugin-import-x';
import jsxA11y from 'eslint-plugin-jsx-a11y';
import playwright from 'eslint-plugin-playwright';
import react from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';
import globals from 'globals';
import tseslint from 'typescript-eslint';

/** Browser-only globals the pure domain layer must never touch (ARCHITECTURE §1). */
const browserGlobals = [
  'window',
  'document',
  'navigator',
  'location',
  'history',
  'localStorage',
  'sessionStorage',
  'fetch',
  'self',
  'globalThis',
  'AudioContext',
  'Worker',
  'caches',
].map((name) => ({
  name,
  message: 'src/domain is pure: inject browser capabilities through a port (src/domain/ports.ts).',
}));

/** A string that is nothing but a hex colour, e.g. '#fb4934' (ADR-0006). */
const hexColour = String.raw`/^#(?:[0-9a-fA-F]{3,4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/`;

export default defineConfig(
  globalIgnores([
    'dist/',
    'coverage/',
    'playwright-report/',
    'test-results/',
    'blob-report/',
    'node_modules/',
  ]),

  // Base: JS recommended plus typescript-eslint's strictest type-aware presets.
  js.configs.recommended,
  tseslint.configs.strictTypeChecked,
  tseslint.configs.stylisticTypeChecked,
  {
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    linterOptions: { reportUnusedDisableDirectives: 'error' },
  },

  importX.flatConfigs.recommended,
  importX.flatConfigs.typescript,
  {
    settings: {
      'import-x/resolver-next': [
        createNodeResolver({ extensions: ['.ts', '.tsx', '.js', '.jsx', '.json'] }),
      ],
    },
    rules: {
      eqeqeq: ['error', 'always'],
      // ADR-0002: no casts except `as const`, which this rule always allows.
      '@typescript-eslint/consistent-type-assertions': ['error', { assertionStyle: 'never' }],
      '@typescript-eslint/consistent-type-imports': [
        'error',
        { fixStyle: 'separate-type-imports' },
      ],
      '@typescript-eslint/switch-exhaustiveness-check': [
        'error',
        { considerDefaultExhaustiveForUnions: false, requireDefaultForNonUnion: true },
      ],
      '@typescript-eslint/ban-ts-comment': [
        'error',
        {
          'ts-ignore': true,
          'ts-nocheck': true,
          'ts-check': false,
          'ts-expect-error': true,
        },
      ],
      'import-x/no-cycle': 'error',
      'import-x/no-self-import': 'error',
      'import-x/no-useless-path-segments': 'error',
      'import-x/no-duplicates': 'error',
      'import-x/order': [
        'error',
        {
          groups: ['builtin', 'external', 'internal', ['parent', 'sibling', 'index']],
          'newlines-between': 'always',
          alphabetize: { order: 'asc', caseInsensitive: true },
        },
      ],
    },
  },

  // Application source: React, hooks, a11y, and the project's syntax bans.
  {
    files: ['src/**/*.{ts,tsx}'],
    ...react.configs.flat['recommended'],
    plugins: { react: fixupPluginRules(react) },
    languageOptions: {
      ...react.configs.flat['recommended']?.languageOptions,
      globals: globals.browser,
    },
    settings: { react: { version: 'detect' } },
  },
  {
    files: ['src/**/*.{ts,tsx}'],
    ...react.configs.flat['jsx-runtime'],
    plugins: { react: fixupPluginRules(react) },
  },
  {
    files: ['src/**/*.{ts,tsx}'],
    ...reactHooks.configs.flat['recommended-latest'],
  },
  {
    files: ['src/**/*.{ts,tsx}'],
    ...jsxA11y.flatConfigs.strict,
    plugins: { 'jsx-a11y': fixupPluginRules(jsxA11y) },
  },
  {
    files: ['src/**/*.{ts,tsx}'],
    rules: {
      'react/prop-types': 'off', // TypeScript does this job.
      'no-restricted-syntax': [
        'error',
        {
          selector: 'TSEnumDeclaration',
          message: 'No enums: use a string-literal union with an `as const` object.',
        },
        { selector: 'ExportDefaultDeclaration', message: 'Named exports only in src/.' },
        {
          selector: "ExportSpecifier[exported.name='default']",
          message: 'Named exports only in src/.',
        },
        {
          selector: `Literal[value=${hexColour}]`,
          message: 'No colour literals in code: use a semantic CSS token (ADR-0006).',
        },
        {
          selector: `TemplateElement[value.raw=${hexColour}]`,
          message: 'No colour literals in code: use a semantic CSS token (ADR-0006).',
        },
      ],
    },
  },

  // Layer boundaries (ARCHITECTURE §1): ui → state → domain, adapters → domain.
  {
    files: ['src/**/*.{ts,tsx}'],
    rules: {
      'import-x/no-restricted-paths': [
        'error',
        {
          zones: [
            {
              target: './src/domain',
              from: [
                './src/app',
                './src/ui',
                './src/state',
                './src/adapters',
                './src/styles',
                './src/main.tsx',
              ],
              message: 'src/domain is pure and imports nothing outside itself.',
            },
            {
              target: './src/state',
              from: ['./src/app', './src/ui', './src/adapters', './src/main.tsx'],
              message: 'src/state may depend only on src/domain.',
            },
            {
              target: './src/adapters',
              from: ['./src/app', './src/ui', './src/state', './src/main.tsx'],
              message: 'Adapters implement domain ports and depend only on src/domain.',
            },
            {
              target: './src/ui',
              from: ['./src/adapters', './src/main.tsx'],
              message: 'UI reaches adapters only through the composition root (src/main.tsx).',
            },
          ],
        },
      ],
    },
  },
  {
    files: ['src/domain/**/*.ts'],
    rules: {
      'no-restricted-globals': ['error', ...browserGlobals],
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['react', 'react/*', 'react-dom', 'react-dom/*'],
              message: 'src/domain is pure: no React.',
            },
          ],
        },
      ],
    },
  },

  // Unit and component tests.
  {
    files: ['src/**/*.test.{ts,tsx}', 'tests/setup/**/*.ts'],
    ...vitest.configs.recommended,
    rules: {
      ...vitest.configs.recommended.rules,
      'vitest/consistent-test-it': ['error', { fn: 'it' }],
      'vitest/no-focused-tests': 'error',
      'vitest/no-disabled-tests': 'error',
      // Tests may use @ts-expect-error, but only with a reason (CLAUDE.md §1).
      '@typescript-eslint/ban-ts-comment': [
        'error',
        { 'ts-ignore': true, 'ts-nocheck': true, 'ts-expect-error': 'allow-with-description' },
      ],
    },
  },

  // End-to-end tests.
  {
    files: ['tests/e2e/**/*.ts'],
    ...playwright.configs['flat/recommended'],
    rules: {
      ...playwright.configs['flat/recommended'].rules,
      'playwright/no-focused-test': 'error',
      'playwright/no-skipped-test': 'error',
      '@typescript-eslint/ban-ts-comment': [
        'error',
        { 'ts-ignore': true, 'ts-nocheck': true, 'ts-expect-error': 'allow-with-description' },
      ],
    },
  },

  // Plain JS files (if any) are outside every tsconfig, so skip type-aware rules.
  {
    files: ['**/*.{js,mjs,cjs}'],
    ...tseslint.configs.disableTypeChecked,
  },

  // Tooling config files run in Node and must default-export their config.
  {
    files: ['*.config.{ts,js,mjs}'],
    languageOptions: { globals: globals.node },
  },

  // Must be last: switch off stylistic rules that Prettier owns.
  prettier,
);

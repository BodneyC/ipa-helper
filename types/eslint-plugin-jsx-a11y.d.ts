// eslint-plugin-jsx-a11y ships no types, and @types/eslint-plugin-jsx-a11y pins
// ESLint 9. This covers the only surface eslint.config.ts uses.
declare module 'eslint-plugin-jsx-a11y' {
  import type { ESLint, Linter } from 'eslint';

  const plugin: ESLint.Plugin & {
    readonly flatConfigs: Readonly<Record<'recommended' | 'strict', Linter.Config>>;
  };
  export default plugin;
}

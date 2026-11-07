import type { DocumentTheme } from '../domain/ports';

/** The parts of a `MediaQueryList` the adapter uses. */
type LightQuery = Pick<MediaQueryList, 'matches' | 'addEventListener' | 'removeEventListener'>;

/** The page background the theme tokens give `root` now (ADR-0006). */
const tokenBackground = (root: HTMLElement): string =>
  getComputedStyle(root).getPropertyValue('--color-bg').trim();

/** Where a `theme-color` meta keeps the colour the build gave it. */
const SYSTEM_COLOUR = 'systemColour';

/**
 * The DocumentTheme port over `<html data-theme data-contrast>` (ADR-0006,
 * FR-40, FR-41). The inline script in index.html sets both before first paint;
 * this keeps them in step with the settings afterwards, and follows the system
 * preference live while the theme is `system`.
 *
 * The build adds one `theme-color` meta per colour scheme (FR-60). While the
 * theme is overridden, both take the active background token, so the browser
 * and installed-app chrome match the page; `system` restores their own (#5).
 */
export const createDocumentTheme = (
  root: HTMLElement = document.documentElement,
  query: LightQuery = window.matchMedia('(prefers-color-scheme: light)'),
  background: (root: HTMLElement) => string = tokenBackground,
): DocumentTheme => {
  const followSystem = () => {
    root.dataset['theme'] = query.matches ? 'light' : 'dark';
  };
  const metas = () => [...root.querySelectorAll<HTMLMetaElement>('meta[name="theme-color"]')];
  return {
    apply: (theme, contrast) => {
      root.dataset['contrast'] = contrast;
      // Adding the same listener twice is a no-op, so repeated `system` calls are safe.
      if (theme === 'system') {
        followSystem();
        query.addEventListener('change', followSystem);
        for (const meta of metas()) meta.content = meta.dataset[SYSTEM_COLOUR] ?? meta.content;
        return;
      }
      query.removeEventListener('change', followSystem);
      root.dataset['theme'] = theme;
      const colour = background(root);
      if (colour === '') return;
      for (const meta of metas()) {
        meta.dataset[SYSTEM_COLOUR] ??= meta.content;
        meta.content = colour;
      }
    },
  };
};

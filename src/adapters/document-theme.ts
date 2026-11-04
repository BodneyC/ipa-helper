import type { DocumentTheme } from '../domain/ports';

/** The parts of a `MediaQueryList` the adapter uses. */
type LightQuery = Pick<MediaQueryList, 'matches' | 'addEventListener' | 'removeEventListener'>;

/**
 * The DocumentTheme port over `<html data-theme data-contrast>` (ADR-0006,
 * FR-40, FR-41). The inline script in index.html sets both before first paint;
 * this keeps them in step with the settings afterwards, and follows the system
 * preference live while the theme is `system`.
 */
export const createDocumentTheme = (
  root: HTMLElement = document.documentElement,
  query: LightQuery = window.matchMedia('(prefers-color-scheme: light)'),
): DocumentTheme => {
  const followSystem = () => {
    root.dataset['theme'] = query.matches ? 'light' : 'dark';
  };
  return {
    apply: (theme, contrast) => {
      root.dataset['contrast'] = contrast;
      // Adding the same listener twice is a no-op, so repeated `system` calls are safe.
      if (theme === 'system') {
        followSystem();
        query.addEventListener('change', followSystem);
        return;
      }
      query.removeEventListener('change', followSystem);
      root.dataset['theme'] = theme;
    },
  };
};

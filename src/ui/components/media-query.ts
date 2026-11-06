import { useCallback, useSyncExternalStore } from 'react';

/** `window.matchMedia(query)`, or `undefined` where there is none (jsdom, very old browsers). */
const listFor = (query: string): MediaQueryList | undefined =>
  typeof window.matchMedia === 'function' ? window.matchMedia(query) : undefined;

/**
 * True while the CSS media query matches, updating when it changes (rotation,
 * resizing). Without `matchMedia` it is always false. Read during render, so the
 * first paint already uses the right layout.
 */
export const useMediaQuery = (query: string): boolean => {
  const subscribe = useCallback(
    (onChange: () => void) => {
      const list = listFor(query);
      list?.addEventListener('change', onChange);
      return () => {
        list?.removeEventListener('change', onChange);
      };
    },
    [query],
  );
  return useSyncExternalStore(subscribe, () => listFor(query)?.matches ?? false);
};

import type { FragmentStore } from '../domain/ports';

const fragmentOf = (win: Window): string => win.location.hash.replace(/^#/, '');

/**
 * The FragmentStore port over `location.hash` (FR-15). Writes use
 * `history.replaceState`, so editing the word adds no history entries and fires
 * no `hashchange`; only the user's own changes reach subscribers.
 *
 * It listens from creation. The app's first render is a transition (main.tsx,
 * NFR-3), so the user can change the URL after the word was read but before
 * anything subscribes; that change is kept and handed to the first subscriber.
 */
export const createUrlFragmentStore = (win: Window = window): FragmentStore => {
  const listeners = new Set<(fragment: string) => void>();
  let missed: string | undefined;
  win.addEventListener('hashchange', () => {
    const fragment = fragmentOf(win);
    if (listeners.size === 0) missed = fragment;
    for (const listener of listeners) listener(fragment);
  });
  return {
    read: () => fragmentOf(win),
    write: (fragment) => {
      const { pathname, search } = win.location;
      win.history.replaceState(
        win.history.state,
        '',
        `${pathname}${search}${fragment ? `#${fragment}` : ''}`,
      );
    },
    subscribe: (listener) => {
      listeners.add(listener);
      if (missed !== undefined) {
        const fragment = missed;
        missed = undefined;
        listener(fragment);
      }
      return () => {
        listeners.delete(listener);
      };
    },
  };
};

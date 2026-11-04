import type { FragmentStore } from '../domain/ports';

/**
 * The FragmentStore port over `location.hash` (FR-15). Writes use
 * `history.replaceState`, so editing the word adds no history entries and fires
 * no `hashchange`; only the user's own changes reach subscribers.
 */
export const createUrlFragmentStore = (win: Window = window): FragmentStore => ({
  read: () => win.location.hash.replace(/^#/, ''),
  write: (fragment) => {
    const { pathname, search } = win.location;
    win.history.replaceState(
      win.history.state,
      '',
      `${pathname}${search}${fragment ? `#${fragment}` : ''}`,
    );
  },
  subscribe: (listener) => {
    const onChange = () => {
      listener(win.location.hash.replace(/^#/, ''));
    };
    win.addEventListener('hashchange', onChange);
    return () => {
      win.removeEventListener('hashchange', onChange);
    };
  },
});

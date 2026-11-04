import { afterEach, describe, expect, it, vi } from 'vitest';

import { createUrlFragmentStore } from './url-hash';

afterEach(() => {
  window.history.replaceState(null, '', '/');
});

describe('URL fragment adapter', () => {
  it('reads the fragment without its #', () => {
    window.history.replaceState(null, '', '/app/?x=1#w=1:theta');
    expect(createUrlFragmentStore().read()).toBe('w=1:theta');
  });

  it('replaces the fragment, keeping path and query, without a new history entry', () => {
    window.history.replaceState(null, '', '/app/?x=1');
    const before = window.history.length;
    const store = createUrlFragmentStore();
    store.write('w=1:n');
    expect(window.location.href).toMatch(/\/app\/\?x=1#w=1:n$/);
    store.write('');
    expect(window.location.href).toMatch(/\/app\/\?x=1$/);
    expect(window.history.length).toBe(before);
  });

  it('reports hashchange events until unsubscribed', () => {
    const store = createUrlFragmentStore();
    const listener = vi.fn();
    const unsubscribe = store.subscribe(listener);
    window.history.replaceState(null, '', '/#w=1:k');
    window.dispatchEvent(new HashChangeEvent('hashchange'));
    unsubscribe();
    window.dispatchEvent(new HashChangeEvent('hashchange'));
    expect(listener).toHaveBeenCalledExactlyOnceWith('w=1:k');
  });
});

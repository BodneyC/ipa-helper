import { describe, expect, it, vi } from 'vitest';

import { createLocalStore } from './local-storage';

describe('createLocalStore (FR-42)', () => {
  it('reads and writes Web Storage', () => {
    const store = createLocalStore(window.localStorage);
    expect(store.get('ipa-helper:test')).toBeUndefined();
    store.set('ipa-helper:test', 'v');
    expect(store.get('ipa-helper:test')).toBe('v');
    window.localStorage.removeItem('ipa-helper:test');
  });

  it('defaults to window.localStorage', () => {
    window.localStorage.setItem('ipa-helper:test', 'w');
    expect(createLocalStore().get('ipa-helper:test')).toBe('w');
    window.localStorage.removeItem('ipa-helper:test');
  });

  it('treats throwing storage as empty, and drops writes', () => {
    const fail = () => {
      throw new DOMException('blocked', 'SecurityError');
    };
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(fail);
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(fail);
    const store = createLocalStore(window.localStorage);
    expect(store.get('k')).toBeUndefined();
    expect(() => {
      store.set('k', 'v');
    }).not.toThrow();
  });

  it('works without storage at all', () => {
    const store = createLocalStore(null);
    store.set('k', 'v');
    expect(store.get('k')).toBeUndefined();
  });

  it('copes with window.localStorage itself throwing', () => {
    vi.spyOn(window, 'localStorage', 'get').mockImplementation(() => {
      throw new DOMException('blocked', 'SecurityError');
    });
    expect(createLocalStore().get('k')).toBeUndefined();
  });
});

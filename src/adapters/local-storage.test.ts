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

  describe('subscribe (#2)', () => {
    const fire = (init: StorageEventInit) => {
      window.dispatchEvent(new StorageEvent('storage', init));
    };

    it('reports another tab changing or removing the key, until unsubscribed', () => {
      const store = createLocalStore(window.localStorage);
      const listener = vi.fn();
      const unsubscribe = store.subscribe('ipa-helper:a', listener);

      fire({ key: 'ipa-helper:a', newValue: '1', storageArea: window.localStorage });
      fire({ key: 'ipa-helper:a', newValue: null, storageArea: window.localStorage });
      expect(listener).toHaveBeenCalledTimes(2);

      unsubscribe();
      fire({ key: 'ipa-helper:a', newValue: '2', storageArea: window.localStorage });
      expect(listener).toHaveBeenCalledTimes(2);
    });

    it('treats clear() as a change to every key', () => {
      const listener = vi.fn();
      createLocalStore(window.localStorage).subscribe('ipa-helper:a', listener);
      fire({ key: null, storageArea: window.localStorage });
      expect(listener).toHaveBeenCalledOnce();
    });

    it('ignores other keys and other storage areas', () => {
      const listener = vi.fn();
      createLocalStore(window.localStorage).subscribe('ipa-helper:a', listener);
      fire({ key: 'ipa-helper:b', newValue: '1', storageArea: window.localStorage });
      fire({ key: 'ipa-helper:a', newValue: '1', storageArea: window.sessionStorage });
      expect(listener).not.toHaveBeenCalled();
    });

    it('never reports changes without storage or an event target', () => {
      const listener = vi.fn();
      createLocalStore(null).subscribe('ipa-helper:a', listener)();
      createLocalStore(window.localStorage, null).subscribe('ipa-helper:a', listener)();
      fire({ key: 'ipa-helper:a', newValue: '1', storageArea: window.localStorage });
      expect(listener).not.toHaveBeenCalled();
    });
  });
});

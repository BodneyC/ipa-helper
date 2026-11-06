import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { useMediaQuery } from './media-query';

/** A controllable stand-in for `window.matchMedia`. */
const fakeMatchMedia = (initial: boolean) => {
  let matches = initial;
  const listeners = new Set<() => void>();
  const list = {
    get matches() {
      return matches;
    },
    addEventListener: (_type: 'change', listener: () => void) => {
      listeners.add(listener);
    },
    removeEventListener: (_type: 'change', listener: () => void) => {
      listeners.delete(listener);
    },
  };
  const matchMedia = vi.fn(() => list);
  vi.stubGlobal('matchMedia', matchMedia);
  return {
    matchMedia,
    listeners,
    set: (next: boolean) => {
      matches = next;
      for (const listener of listeners) listener();
    },
  };
};

describe('useMediaQuery', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('follows the query as it starts and changes, and stops listening on unmount', () => {
    const media = fakeMatchMedia(true);
    const { result, unmount } = renderHook(() => useMediaQuery('(width < 768px)'));
    expect(result.current).toBe(true);
    expect(media.matchMedia).toHaveBeenCalledWith('(width < 768px)');

    act(() => {
      media.set(false);
    });
    expect(result.current).toBe(false);

    unmount();
    expect(media.listeners.size).toBe(0);
  });

  it('is false without matchMedia', () => {
    vi.stubGlobal('matchMedia', undefined);
    const { result, unmount } = renderHook(() => useMediaQuery('(width < 768px)'));
    expect(result.current).toBe(false);
    unmount();
  });
});

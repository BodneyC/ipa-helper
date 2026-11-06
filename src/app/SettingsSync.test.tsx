import { act, render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { Providers } from './providers';
import { SettingsSync } from './SettingsSync';
import type { DocumentTheme, KeyValueStore } from '../domain/ports';
import { useSettings } from '../state/hooks';
import type { SettingsStore } from '../state/hooks';
import { DEFAULT_SETTINGS, SETTINGS_STORAGE_KEY } from '../state/settings';

function Probe({ onStore }: { readonly onStore: (store: SettingsStore) => void }) {
  const store = useSettings();
  onStore(store);
  return null;
}

describe('<SettingsSync> (FR-40–FR-42)', () => {
  it('stores settings and applies the theme, again on each change', () => {
    const set = vi.fn<KeyValueStore['set']>();
    const apply = vi.fn<DocumentTheme['apply']>();
    let settings: SettingsStore | undefined;
    render(
      <Providers
        services={{
          store: { get: () => undefined, set, subscribe: () => () => undefined },
          theme: { apply },
        }}
      >
        <SettingsSync />
        <Probe
          onStore={(s) => {
            settings = s;
          }}
        />
      </Providers>,
    );
    expect(set).toHaveBeenLastCalledWith(SETTINGS_STORAGE_KEY, JSON.stringify(DEFAULT_SETTINGS));
    expect(apply).toHaveBeenLastCalledWith('system', 'medium');

    act(() => {
      settings?.dispatch({ type: 'update', patch: { theme: 'light', contrast: 'hard' } });
    });
    expect(apply).toHaveBeenLastCalledWith('light', 'hard');
    expect(set).toHaveBeenLastCalledWith(
      SETTINGS_STORAGE_KEY,
      JSON.stringify({ ...DEFAULT_SETTINGS, theme: 'light', contrast: 'hard' }),
    );

    act(() => {
      settings?.dispatch({ type: 'update', patch: { macroName: 'tipa' } });
    });
    expect(apply).toHaveBeenCalledTimes(2);
  });

  describe('with another tab (#2)', () => {
    /** A shared in-memory store; `otherTabWrites` sets a value and fires the `storage` listeners. */
    const sharedStore = () => {
      const data = new Map<string, string>();
      const listeners = new Set<() => void>();
      const store: KeyValueStore = {
        get: (k) => data.get(k),
        set: (k, v) => void data.set(k, v),
        subscribe: (_key, listener) => {
          listeners.add(listener);
          return () => {
            listeners.delete(listener);
          };
        },
      };
      const otherTabWrites = (settings: object) => {
        data.set(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
        for (const listener of listeners) listener();
      };
      const stored = (): unknown => JSON.parse(data.get(SETTINGS_STORAGE_KEY) ?? 'null');
      return { store, otherTabWrites, stored, listeners };
    };

    const mount = (store: KeyValueStore) => {
      const apply = vi.fn<DocumentTheme['apply']>();
      let current: SettingsStore | undefined;
      const view = render(
        <Providers services={{ store, theme: { apply } }}>
          <SettingsSync />
          <Probe
            onStore={(s) => {
              current = s;
            }}
          />
        </Providers>,
      );
      return { apply, view, settings: () => current };
    };

    it("applies another tab's change, and keeps it when this tab changes something else", () => {
      const { store, otherTabWrites, stored } = sharedStore();
      const { apply, settings } = mount(store);

      act(() => {
        otherTabWrites({ ...DEFAULT_SETTINGS, theme: 'dark' });
      });
      expect(settings()?.settings.theme).toBe('dark');
      expect(apply).toHaveBeenLastCalledWith('dark', 'medium');

      act(() => {
        settings()?.dispatch({ type: 'update', patch: { inventory: 'extended' } });
      });
      expect(stored()).toEqual({ ...DEFAULT_SETTINGS, theme: 'dark', inventory: 'extended' });
    });

    it('merges a change another tab stored without this tab hearing of it', () => {
      const { store, stored, listeners } = sharedStore();
      const { settings } = mount(store);
      // A write whose storage event hasn't arrived yet.
      store.set(SETTINGS_STORAGE_KEY, JSON.stringify({ ...DEFAULT_SETTINGS, tieBars: true }));
      expect(listeners.size).toBe(1);

      act(() => {
        settings()?.dispatch({ type: 'update', patch: { soundOnSelect: true } });
      });
      expect(stored()).toEqual({ ...DEFAULT_SETTINGS, tieBars: true, soundOnSelect: true });
      expect(settings()?.settings).toEqual(stored());
    });

    it('keeps its own changes when storage drops every write', () => {
      const { settings } = mount({
        get: () => undefined,
        set: () => undefined,
        subscribe: () => () => undefined,
      });
      act(() => {
        settings()?.dispatch({ type: 'update', patch: { theme: 'light' } });
      });
      act(() => {
        settings()?.dispatch({ type: 'update', patch: { contrast: 'hard' } });
      });
      expect(settings()?.settings).toEqual({
        ...DEFAULT_SETTINGS,
        theme: 'light',
        contrast: 'hard',
      });
    });

    it('stops listening when unmounted', () => {
      const { store, listeners } = sharedStore();
      const { view } = mount(store);
      view.unmount();
      expect(listeners.size).toBe(0);
    });
  });
});

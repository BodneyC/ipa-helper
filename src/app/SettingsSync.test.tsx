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
      <Providers services={{ store: { get: () => undefined, set }, theme: { apply } }}>
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
});

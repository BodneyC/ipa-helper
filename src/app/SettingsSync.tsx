import { useEffect, useRef } from 'react';

import { useServices, useSettings } from '../state/hooks';
import {
  SETTINGS_STORAGE_KEY,
  loadSettings,
  mergeSettings,
  sameSettings,
  saveSettings,
} from '../state/settings';
import type { Settings } from '../state/settings';

/**
 * Keeps the outside world in step with the settings (FR-40–FR-42): stores them
 * on every change, and applies the theme and contrast to the page. Renders nothing.
 *
 * Several tabs share the stored settings (#2). A change in another tab is loaded
 * here when the `storage` event says so, and each write merges with what is stored
 * ({@link mergeSettings}), so one tab never overwrites another's change.
 */
export function SettingsSync() {
  const { settings, dispatch } = useSettings();
  const { store, theme } = useServices();
  /** What this tab last saw in storage. */
  const base = useRef<Settings | undefined>(undefined);

  useEffect(() => {
    const stored = loadSettings(store);
    const merged = mergeSettings(stored, base.current ?? stored, settings);
    saveSettings(store, merged);
    base.current = loadSettings(store);
    if (!sameSettings(merged, settings)) dispatch({ type: 'update', patch: merged });
  }, [store, settings, dispatch]);

  useEffect(
    () =>
      store.subscribe(SETTINGS_STORAGE_KEY, () => {
        const stored = loadSettings(store);
        base.current = stored;
        dispatch({ type: 'update', patch: stored });
      }),
    [store, dispatch],
  );

  useEffect(() => {
    theme.apply(settings.theme, settings.contrast);
  }, [theme, settings.theme, settings.contrast]);

  return null;
}

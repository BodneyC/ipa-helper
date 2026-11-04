import { useEffect } from 'react';

import { useServices, useSettings } from '../state/hooks';
import { saveSettings } from '../state/settings';

/**
 * Keeps the outside world in step with the settings (FR-40–FR-42): stores them
 * on every change, and applies the theme and contrast to the page. Renders nothing.
 */
export function SettingsSync() {
  const { settings } = useSettings();
  const { store, theme } = useServices();

  useEffect(() => {
    saveSettings(store, settings);
  }, [store, settings]);

  useEffect(() => {
    theme.apply(settings.theme, settings.contrast);
  }, [theme, settings.theme, settings.contrast]);

  return null;
}

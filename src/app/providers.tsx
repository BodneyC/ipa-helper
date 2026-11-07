import { useMemo, useReducer } from 'react';
import type { ReactNode } from 'react';

import {
  NULL_AUDIO,
  NULL_CLIPBOARD,
  NULL_DOWNLOADS,
  NULL_FRAGMENTS,
  NULL_STORE,
  NULL_THEME,
  NULL_UPDATES,
} from '../domain/ports';
import { EMPTY_WORD } from '../domain/word/word';
import type { Word } from '../domain/word/word';
import { editorReducer, initialEditorState } from '../state/editor';
import { EditorContext, ServicesContext, SettingsContext } from '../state/hooks';
import type { Services } from '../state/hooks';
import { DEFAULT_SETTINGS, settingsReducer } from '../state/settings';
import type { Settings } from '../state/settings';

const NULL_SERVICES: Services = {
  audio: NULL_AUDIO,
  clipboard: NULL_CLIPBOARD,
  downloads: NULL_DOWNLOADS,
  fragments: NULL_FRAGMENTS,
  store: NULL_STORE,
  theme: NULL_THEME,
  updates: NULL_UPDATES,
};

interface ProvidersProps {
  /** The word to start with, e.g. decoded from the URL fragment (FR-15). */
  readonly initialWord?: Word;
  readonly initialSettings?: Settings;
  /** Adapters for the domain ports. Any left out are null objects (tests, no browser). */
  readonly services?: Partial<Services>;
  readonly children: ReactNode;
}

/**
 * Context providers for the editor and settings stores. The composition root
 * (`src/main.tsx`) passes in the initial state that adapters have read.
 */
export function Providers({
  initialWord = EMPTY_WORD,
  initialSettings = DEFAULT_SETTINGS,
  services = NULL_SERVICES,
  children,
}: ProvidersProps) {
  const { audio, clipboard, downloads, fragments, store, theme, updates } = {
    ...NULL_SERVICES,
    ...services,
  };
  const allServices = useMemo(
    () => ({ audio, clipboard, downloads, fragments, store, theme, updates }),
    [audio, clipboard, downloads, fragments, store, theme, updates],
  );
  const [state, dispatch] = useReducer(editorReducer, initialWord, initialEditorState);
  const [settings, settingsDispatch] = useReducer(settingsReducer, initialSettings);
  const editor = useMemo(() => ({ state, dispatch }), [state]);
  const settingsStore = useMemo(() => ({ settings, dispatch: settingsDispatch }), [settings]);
  return (
    <ServicesContext value={allServices}>
      <SettingsContext value={settingsStore}>
        <EditorContext value={editor}>{children}</EditorContext>
      </SettingsContext>
    </ServicesContext>
  );
}

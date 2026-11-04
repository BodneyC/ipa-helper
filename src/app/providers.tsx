import { useMemo, useReducer } from 'react';
import type { ReactNode } from 'react';

import { NULL_CLIPBOARD } from '../domain/ports';
import { EMPTY_WORD } from '../domain/word/word';
import type { Word } from '../domain/word/word';
import { editorReducer, initialEditorState } from '../state/editor';
import { EditorContext, ServicesContext, SettingsContext } from '../state/hooks';
import type { Services } from '../state/hooks';
import { DEFAULT_SETTINGS, settingsReducer } from '../state/settings';
import type { Settings } from '../state/settings';

const NULL_SERVICES: Services = { clipboard: NULL_CLIPBOARD };

interface ProvidersProps {
  /** The word to start with, e.g. decoded from the URL fragment (FR-15). */
  readonly initialWord?: Word;
  readonly initialSettings?: Settings;
  /** Adapters for the domain ports. Defaults to null objects (tests, no browser). */
  readonly services?: Services;
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
  const [state, dispatch] = useReducer(editorReducer, initialWord, initialEditorState);
  const [settings, settingsDispatch] = useReducer(settingsReducer, initialSettings);
  const editor = useMemo(() => ({ state, dispatch }), [state]);
  const settingsStore = useMemo(() => ({ settings, dispatch: settingsDispatch }), [settings]);
  return (
    <ServicesContext value={services}>
      <SettingsContext value={settingsStore}>
        <EditorContext value={editor}>{children}</EditorContext>
      </SettingsContext>
    </ServicesContext>
  );
}

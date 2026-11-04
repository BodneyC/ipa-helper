import { useMemo, useReducer } from 'react';
import type { ReactNode } from 'react';

import { EMPTY_WORD } from '../domain/word/word';
import type { Word } from '../domain/word/word';
import { editorReducer, initialEditorState } from '../state/editor';
import { EditorContext, SettingsContext } from '../state/hooks';
import { DEFAULT_SETTINGS, settingsReducer } from '../state/settings';
import type { Settings } from '../state/settings';

interface ProvidersProps {
  /** The word to start with, e.g. decoded from the URL fragment (FR-15). */
  readonly initialWord?: Word;
  readonly initialSettings?: Settings;
  readonly children: ReactNode;
}

/**
 * Context providers for the editor and settings stores. The composition root
 * (`src/main.tsx`) passes in the initial state that adapters have read.
 */
export function Providers({
  initialWord = EMPTY_WORD,
  initialSettings = DEFAULT_SETTINGS,
  children,
}: ProvidersProps) {
  const [state, dispatch] = useReducer(editorReducer, initialWord, initialEditorState);
  const [settings, settingsDispatch] = useReducer(settingsReducer, initialSettings);
  const editor = useMemo(() => ({ state, dispatch }), [state]);
  const settingsStore = useMemo(() => ({ settings, dispatch: settingsDispatch }), [settings]);
  return (
    <SettingsContext value={settingsStore}>
      <EditorContext value={editor}>{children}</EditorContext>
    </SettingsContext>
  );
}

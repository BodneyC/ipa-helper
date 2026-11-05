import { createContext, useContext } from 'react';
import type { Dispatch } from 'react';

import type { EditorAction, EditorState } from './editor';
import type { Settings, SettingsAction } from './settings';
import type {
  AppUpdates,
  AudioPlayer,
  Clipboard,
  DocumentTheme,
  FragmentStore,
  KeyValueStore,
} from '../domain/ports';

/** The editor store (ARCHITECTURE §5), provided by `<Providers>`. */
export interface EditorStore {
  readonly state: EditorState;
  readonly dispatch: Dispatch<EditorAction>;
}

/** The settings store (ARCHITECTURE §5), provided by `<Providers>`. */
export interface SettingsStore {
  readonly settings: Settings;
  readonly dispatch: Dispatch<SettingsAction>;
}

export const EditorContext = createContext<EditorStore | null>(null);
export const SettingsContext = createContext<SettingsStore | null>(null);

const required = <T>(value: T | null, name: string): T => {
  if (value === null) throw new Error(`${name} must be used inside <Providers>`);
  return value;
};

/** The word being edited, its cursor and history, and the dispatcher. */
export const useEditor = (): EditorStore => required(useContext(EditorContext), 'useEditor');

/** The user's settings and the dispatcher. */
export const useSettings = (): SettingsStore =>
  required(useContext(SettingsContext), 'useSettings');

/** Side-effecting services (ports implemented by adapters), injected by the composition root. */
export interface Services {
  /** Speaks symbols and words (FR-30, FR-31). */
  readonly audio: AudioPlayer;
  readonly clipboard: Clipboard;
  readonly fragments: FragmentStore;
  /** Where settings persist (FR-42). */
  readonly store: KeyValueStore;
  /** Applies the theme to the page (FR-40, FR-41). */
  readonly theme: DocumentTheme;
  /** New versions of the installed app (FR-62). */
  readonly updates: AppUpdates;
}

export const ServicesContext = createContext<Services | null>(null);

/** The adapters the composition root wired in. */
export const useServices = (): Services => required(useContext(ServicesContext), 'useServices');

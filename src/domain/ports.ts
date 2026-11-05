import type { SymbolId } from './inventory/symbol-id';
import { err } from './result';
import type { Result } from './result';
import type { Word } from './word/word';

/** Why a clipboard write failed. */
interface ClipboardError {
  readonly kind: 'clipboard-unavailable' | 'clipboard-denied';
}

/** Writes text to the system clipboard (FR-20, FR-21). Implemented in src/adapters. */
export interface Clipboard {
  writeText(text: string): Promise<Result<void, ClipboardError>>;
}

/** A clipboard that always fails, for tests and environments without one. */
export const NULL_CLIPBOARD: Clipboard = {
  writeText: () => Promise.resolve(err({ kind: 'clipboard-unavailable' })),
};

/** The URL fragment, without its `#` (FR-15). Implemented in src/adapters. */
export interface FragmentStore {
  read(): string;
  /** Replaces the fragment without adding a history entry. */
  write(fragment: string): void;
  /** Calls `listener` when the user changes the fragment. Returns an unsubscribe function. */
  subscribe(listener: (fragment: string) => void): () => void;
}

/** A fragment store with nothing in it, for tests and environments without a URL. */
export const NULL_FRAGMENTS: FragmentStore = {
  read: () => '',
  write: () => undefined,
  subscribe: () => () => undefined,
};

/** String key–value storage that outlives the page (FR-42). Implemented in src/adapters. */
export interface KeyValueStore {
  /** The stored value, or `undefined` when there is none or storage is unavailable. */
  get(key: string): string | undefined;
  /** Stores a value. Fails silently: settings then last only for the visit. */
  set(key: string, value: string): void;
}

/** A store that remembers nothing, for tests and environments without storage. */
export const NULL_STORE: KeyValueStore = {
  get: () => undefined,
  set: () => undefined,
};

/** Applies the colour theme to the page (FR-40, FR-41). Implemented in src/adapters. */
export interface DocumentTheme {
  /** `system` follows `prefers-color-scheme`, and keeps following it until the next call. */
  apply(theme: 'system' | 'dark' | 'light', contrast: 'soft' | 'medium' | 'hard'): void;
}

/** A theme target that does nothing, for tests. */
export const NULL_THEME: DocumentTheme = { apply: () => undefined };

/** Why a sound could not be played (FR-30, FR-31). */
export interface AudioError {
  /**
   * `audio-unsupported`: no Web Audio, or no source for that channel yet.
   * `audio-load-failed`: the clip or model could not be fetched or decoded.
   * `audio-playback-failed`: the audio device refused to play.
   */
  readonly kind: 'audio-unsupported' | 'audio-load-failed' | 'audio-playback-failed';
}

/** The two kinds of sound, which load independently (ADR-0009): symbol clips and the word voice. */
export type AudioChannel = 'symbols' | 'words';

/**
 * Where a channel is in its lazy start-up (FR-33): `idle` until first asked,
 * `loading` until its first sound has loaded, then `ready`. A failed first load
 * returns to `idle` so the next request retries. `unsupported` never changes.
 */
export type AudioStatus = 'unsupported' | 'idle' | 'loading' | 'ready';

/** Speaks symbols and words in a British voice (FR-30, FR-31, ARCHITECTURE §8). Implemented in src/adapters. */
export interface AudioPlayer {
  /** A snapshot, replaced (never mutated) when a channel's status changes. */
  readonly status: Readonly<Record<AudioChannel, AudioStatus>>;
  /**
   * How much of a loading channel's download has arrived, from 0 to 1, or
   * `undefined` when the channel isn't loading or its source can't tell (FR-33).
   * A snapshot, replaced when it changes.
   */
  readonly progress: Readonly<Record<AudioChannel, number | undefined>>;
  /** Calls `listener` after `status` or `progress` changes. Returns an unsubscribe function. */
  subscribe(listener: () => void): () => void;
  /**
   * True when `id` has a sound this player can play (FR-30). Symbols without a
   * clip, such as most of the full IPA (ADR-0012), get no play affordance.
   */
  canPlaySymbol(id: SymbolId): boolean;
  /** Resolves when the sound ends or a newer one cuts it off. */
  playSymbol(id: SymbolId): Promise<Result<void, AudioError>>;
  /** Resolves when the sound ends or a newer one cuts it off. */
  playWord(word: Word): Promise<Result<void, AudioError>>;
}

/** A player with no audio, for tests and environments without Web Audio. */
export const NULL_AUDIO: AudioPlayer = {
  status: { symbols: 'unsupported', words: 'unsupported' },
  progress: { symbols: undefined, words: undefined },
  subscribe: () => () => undefined,
  canPlaySymbol: () => false,
  playSymbol: () => Promise.resolve(err({ kind: 'audio-unsupported' })),
  playWord: () => Promise.resolve(err({ kind: 'audio-unsupported' })),
};

/**
 * New versions of the installed app (FR-62, ADR-0013). Implemented in
 * src/adapters by the service-worker registration.
 */
export interface AppUpdates {
  /** True once a new version has downloaded and is waiting to take over. Never goes back to false. */
  available(): boolean;
  /** Calls `listener` when `available()` changes. Returns an unsubscribe function. */
  subscribe(listener: () => void): () => void;
  /** Switches to the waiting version and reloads the page. Does nothing when none is waiting. */
  apply(): void;
}

/** Updates that never arrive, for tests, development and browsers without service workers. */
export const NULL_UPDATES: AppUpdates = {
  available: () => false,
  subscribe: () => () => undefined,
  apply: () => undefined,
};

import { err } from './result';
import type { Result } from './result';

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

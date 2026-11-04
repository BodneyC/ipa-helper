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

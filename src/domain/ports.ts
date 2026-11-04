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

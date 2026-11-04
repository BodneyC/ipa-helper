import type { Clipboard } from '../domain/ports';
import { err, ok } from '../domain/result';

/**
 * The Clipboard port over the async Clipboard API. Writing needs a secure
 * context and a user gesture; a refusal comes back as `clipboard-denied`.
 */
export const createBrowserClipboard = (
  clipboard: Pick<globalThis.Clipboard, 'writeText'> | undefined = typeof navigator === 'undefined'
    ? undefined
    : navigator.clipboard,
): Clipboard => ({
  writeText: async (text) => {
    if (clipboard === undefined) return err({ kind: 'clipboard-unavailable' });
    try {
      await clipboard.writeText(text);
      return ok(undefined);
    } catch {
      return err({ kind: 'clipboard-denied' });
    }
  },
});

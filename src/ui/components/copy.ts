import { useCallback } from 'react';

import { useAnnounce } from './Announcer';
import { useServices } from '../../state/hooks';

/**
 * Copies text through the Clipboard port and announces the outcome (FR-23).
 * Resolves to whether the copy worked.
 */
export const useCopy = (): ((text: string, done: string) => Promise<boolean>) => {
  const { clipboard } = useServices();
  const announce = useAnnounce();
  return useCallback(
    async (text, done) => {
      const result = await clipboard.writeText(text);
      announce(result.ok ? done : `Couldn't copy. Select the text and copy it by hand.`);
      return result.ok;
    },
    [clipboard, announce],
  );
};

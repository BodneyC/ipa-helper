import { useCallback, useSyncExternalStore } from 'react';

import type { PhoneSymbol } from '../../../domain/inventory/types';
import type { AudioPlayer } from '../../../domain/ports';
import { labelsOf } from '../../../domain/serialise/labels';
import type { RDisplay } from '../../../domain/serialise/serialiser';
import { useServices } from '../../../state/hooks';
import { useAnnounce } from '../../components/Announcer';

/** The audio player's per-channel status, re-rendering when it changes (FR-33). */
export const useAudioStatus = (): AudioPlayer['status'] => {
  const { audio } = useServices();
  const subscribe = useCallback((listener: () => void) => audio.subscribe(listener), [audio]);
  return useSyncExternalStore(subscribe, () => audio.status);
};

/**
 * Plays a symbol's clip (FR-30), announcing a failure so it isn't silent for
 * screen reader users either. `undefined` when this browser can't play symbols,
 * so callers can leave the play affordance out.
 */
export const usePlaySymbol = (rDisplay: RDisplay): ((symbol: PhoneSymbol) => void) | undefined => {
  const { audio } = useServices();
  const status = useAudioStatus();
  const announce = useAnnounce();
  const play = useCallback(
    (symbol: PhoneSymbol) => {
      void audio.playSymbol(symbol.id).then((result) => {
        if (!result.ok) announce(`Couldn’t play ${labelsOf(symbol, rDisplay).ipa}`);
      });
    },
    [audio, announce, rDisplay],
  );
  return status.symbols === 'unsupported' ? undefined : play;
};

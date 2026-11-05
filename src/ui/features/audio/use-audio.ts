import { useCallback, useMemo, useSyncExternalStore } from 'react';

import { isSounding } from '../../../domain/inventory/index';
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

/** How much of each loading channel's download has arrived, 0–1 (FR-33). */
export const useAudioProgress = (): AudioPlayer['progress'] => {
  const { audio } = useServices();
  const subscribe = useCallback((listener: () => void) => audio.subscribe(listener), [audio]);
  return useSyncExternalStore(subscribe, () => audio.progress);
};

/** Plays palette symbols (FR-30). */
export interface SymbolPlayer {
  /** True when `symbol` makes a sound and has a clip, so it gets a play affordance. */
  readonly canPlay: (symbol: PhoneSymbol) => boolean;
  readonly play: (symbol: PhoneSymbol) => void;
}

/**
 * Plays a symbol's clip (FR-30), announcing a failure so it isn't silent for
 * screen reader users either. `undefined` when this browser can't play symbols,
 * so callers can leave the play affordance out.
 */
export const usePlaySymbol = (rDisplay: RDisplay): SymbolPlayer | undefined => {
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
  const canPlay = useCallback(
    (symbol: PhoneSymbol) => isSounding(symbol) && audio.canPlaySymbol(symbol.id),
    [audio],
  );
  return useMemo(
    () => (status.symbols === 'unsupported' ? undefined : { canPlay, play }),
    [status.symbols, canPlay, play],
  );
};

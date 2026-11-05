import { Palette } from './Palette';
import type { PaletteProps } from './Palette';
import { isSounding } from '../../../domain/inventory/index';
import { usePlaySymbol } from '../audio/use-audio';

interface PaletteWithAudioProps extends Omit<PaletteProps, 'onPlay'> {
  /** FR-34: play each symbol as it is added. */
  readonly soundOnSelect: boolean;
}

/**
 * The palette wired to the audio player (FR-30, FR-34). It sits inside the
 * announcer, so a sound that fails to play is announced.
 */
export function PaletteWithAudio({ soundOnSelect, onActivate, ...props }: PaletteWithAudioProps) {
  const play = usePlaySymbol(props.rDisplay);
  return (
    <Palette
      {...props}
      onPlay={play}
      onActivate={(symbol) => {
        onActivate(symbol);
        if (soundOnSelect && isSounding(symbol)) play?.(symbol);
      }}
    />
  );
}

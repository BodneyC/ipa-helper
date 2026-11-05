import { Palette } from './Palette';
import type { PaletteProps } from './Palette';
import { usePlaySymbol } from '../audio/use-audio';

interface PaletteWithAudioProps extends Omit<PaletteProps, 'player'> {
  /** FR-34: play each symbol as it is added. */
  readonly soundOnSelect: boolean;
}

/**
 * The palette wired to the audio player (FR-30, FR-34). It sits inside the
 * announcer, so a sound that fails to play is announced.
 */
export function PaletteWithAudio({ soundOnSelect, onActivate, ...props }: PaletteWithAudioProps) {
  const player = usePlaySymbol(props.glyphs);
  return (
    <Palette
      {...props}
      player={player}
      onActivate={(symbol) => {
        onActivate(symbol);
        if (soundOnSelect && player?.canPlay(symbol) === true) player.play(symbol);
      }}
    />
  );
}

import { useId, useState } from 'react';

import styles from './PlayWordButton.module.css';
import { useAudioProgress, useAudioStatus } from './use-audio';
import { isSounding, symbolById } from '../../../domain/inventory/index';
import type { AudioError } from '../../../domain/ports';
import { useEditor, useServices } from '../../../state/hooks';
import { useAnnounce } from '../../components/Announcer';

/** What a failed play tells the user. */
const MESSAGES: Readonly<Record<AudioError['kind'], string>> = {
  'audio-load-failed': 'Couldn’t load the voice. Check your connection and try again.',
  'audio-playback-failed': 'Couldn’t play the word. Try again.',
  'audio-unsupported': 'This word can’t be spoken.',
};

/**
 * FR-31: speaks the whole word in the British voice. The first play loads the
 * voice (FR-33): the button says so and a progress bar shows the download.
 * The button stays focusable, and ignores clicks, until the voice is ready.
 * A failure is shown next to the button and announced; the next click retries.
 * Without word audio (no Web Audio or no workers) there is no button at all.
 */
export function PlayWordButton() {
  const { audio } = useServices();
  const { state } = useEditor();
  const status = useAudioStatus().words;
  const fraction = useAudioProgress().words;
  const announce = useAnnounce();
  const errorId = useId();
  const [error, setError] = useState<string | undefined>(undefined);

  if (status === 'unsupported') return null;

  const sayable = state.word.some((token) => {
    const symbol = symbolById(token.symbolId);
    return symbol !== undefined && isSounding(symbol);
  });
  const loading = status === 'loading';

  const play = () => {
    if (loading) return;
    setError(undefined);
    void audio.playWord(state.word).then((result) => {
      if (result.ok) return;
      const message = MESSAGES[result.error.kind];
      setError(message);
      announce(message);
    });
  };

  return (
    <>
      <button
        type="button"
        className={styles['button']}
        disabled={!sayable}
        aria-disabled={loading || undefined}
        aria-describedby={error === undefined ? undefined : errorId}
        onClick={play}
      >
        <svg viewBox="0 0 16 16" className={styles['icon']} aria-hidden="true">
          <path d="M2 6h3l4-3v10l-4-3H2z" />
          <path d="M11 5.5a3.5 3.5 0 0 1 0 5M12.5 3.5a6 6 0 0 1 0 9" className={styles['waves']} />
        </svg>
        {loading ? 'Loading voice…' : 'Play word'}
      </button>
      {loading && (
        // No value while the size is unknown: the bar is then indeterminate.
        <progress
          className={styles['progress']}
          max={1}
          value={fraction}
          aria-label="Downloading the voice"
        />
      )}
      {error !== undefined && (
        <p id={errorId} className={styles['error']}>
          {error}
        </p>
      )}
    </>
  );
}

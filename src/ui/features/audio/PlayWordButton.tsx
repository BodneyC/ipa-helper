import { useId, useState } from 'react';

import styles from './PlayWordButton.module.css';
import { useAudioProgress, useAudioStatus } from './use-audio';
import { isSounding, symbolById } from '../../../domain/inventory/index';
import type { SymbolId } from '../../../domain/inventory/symbol-id';
import type { PhoneSymbol } from '../../../domain/inventory/types';
import type { AudioError } from '../../../domain/ports';
import { labelsOf } from '../../../domain/serialise/labels';
import { useEditor, useServices, useSettings } from '../../../state/hooks';
import { useAnnounce } from '../../components/Announcer';

/** What a failed play tells the user. */
const MESSAGES: Readonly<Record<AudioError['kind'], string>> = {
  'audio-load-failed': 'Couldn’t load the voice. Check your connection and try again.',
  'audio-playback-failed': 'Couldn’t play the word. Try again.',
  'audio-unsupported': 'This word can’t be spoken.',
};

/** What a played word left out (#15): marks the voice can't say. */
type Note =
  | { readonly kind: 'error'; readonly message: string }
  | { readonly kind: 'dropped'; readonly marks: readonly PhoneSymbol[] };

const DROPPED = 'Played without:';

const droppedMarks = (ids: readonly SymbolId[]): readonly PhoneSymbol[] =>
  ids.flatMap((id) => symbolById(id) ?? []);

/**
 * FR-31: speaks the whole word in the British voice. The first play loads the
 * voice (FR-33): the button says so and a progress bar shows the download.
 * The button stays focusable, and ignores clicks, until the voice is ready.
 * A failure is shown next to the button and announced; the next click retries.
 * Diacritics the voice can't say are left out, and the button then names
 * them the same way (#15).
 * Without word audio (no Web Audio or no workers) there is no button at all.
 */
export function PlayWordButton() {
  const { audio } = useServices();
  const { state } = useEditor();
  const status = useAudioStatus().words;
  const fraction = useAudioProgress().words;
  const { settings } = useSettings();
  const announce = useAnnounce();
  const noteId = useId();
  const [note, setNote] = useState<Note | undefined>(undefined);

  if (status === 'unsupported') return null;

  const sayable = state.word.some((token) => {
    const symbol = symbolById(token.symbolId);
    return symbol !== undefined && isSounding(symbol);
  });
  const loading = status === 'loading';

  const play = () => {
    if (loading) return;
    setNote(undefined);
    void audio.playWord(state.word).then((result) => {
      if (!result.ok) {
        const message = MESSAGES[result.error.kind];
        setNote({ kind: 'error', message });
        announce(message);
        return;
      }
      const marks = droppedMarks(result.value.dropped);
      if (marks.length === 0) return;
      setNote({ kind: 'dropped', marks });
      announce(`${DROPPED} ${marks.map((m) => m.name).join(', ')}`);
    });
  };

  return (
    <>
      <button
        type="button"
        className={styles['button']}
        disabled={!sayable}
        aria-disabled={loading || undefined}
        aria-describedby={note === undefined ? undefined : noteId}
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
      {note?.kind === 'error' && (
        <p id={noteId} className={styles['error']}>
          {note.message}
        </p>
      )}
      {note?.kind === 'dropped' && (
        <p id={noteId} className={styles['note']}>
          {DROPPED}{' '}
          {note.marks.map((mark, i) => (
            <span key={mark.id}>
              {i > 0 && ', '}
              {/* A lone mark sits on ◌, as on its key; the name is what's read out. */}
              <span className={styles['glyph']} aria-hidden="true">
                {labelsOf(mark, settings).glyph}
              </span>{' '}
              {mark.name}
            </span>
          ))}
        </p>
      )}
    </>
  );
}

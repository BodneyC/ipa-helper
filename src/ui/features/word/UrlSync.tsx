import { useEffect, useState } from 'react';

import styles from './UrlSync.module.css';
import { decodeWord, encodeWord } from '../../../domain/codec/url';
import type { FragmentError } from '../../../domain/codec/url';
import type { FragmentStore } from '../../../domain/ports';
import { EMPTY_WORD, idsOf } from '../../../domain/word/word';
import type { Word } from '../../../domain/word/word';
import { useEditor, useServices } from '../../../state/hooks';

/** How long to wait after an edit before rewriting the URL (ARCHITECTURE §5). */
export const URL_WRITE_DELAY_MS = 250;

/** FR-15: the word a shared link carries, or the empty word if it carries none or a bad one. */
export const readInitialWord = (fragments: FragmentStore): Word => {
  const result = decodeWord(fragments.read());
  return result.ok ? result.value : EMPTY_WORD;
};

const describeError = (error: FragmentError): string => {
  switch (error.kind) {
    case 'malformed':
      return 'The word in this link couldn’t be read, so it was ignored.';
    case 'unsupported-version':
      return 'This link was made by a newer version of ipa-helper, so its word was ignored.';
    case 'unknown-symbol':
      return `This link contains a symbol ipa-helper doesn’t know (“${error.id}”), so its word was ignored.`;
  }
};

const notice = (fragment: string): string | null => {
  const result = decodeWord(fragment);
  return result.ok ? null : describeError(result.error);
};

/**
 * FR-15: keeps the URL fragment in step with the word. Edits are written back,
 * debounced; a fragment the user changes is loaded as one undoable edit; an
 * invalid fragment is ignored with a non-blocking notice.
 */
export function UrlSync() {
  const { fragments } = useServices();
  const { state, dispatch } = useEditor();
  const [message, setMessage] = useState(() => notice(fragments.read()));

  // Mirror the word into the fragment.
  useEffect(() => {
    const timer = window.setTimeout(() => {
      fragments.write(encodeWord(state.word));
    }, URL_WRITE_DELAY_MS);
    return () => {
      window.clearTimeout(timer);
    };
  }, [fragments, state.word]);

  // Follow fragments the user pastes or edits.
  useEffect(
    () =>
      fragments.subscribe((fragment) => {
        const result = decodeWord(fragment);
        if (!result.ok) {
          setMessage(describeError(result.error));
          return;
        }
        setMessage(null);
        const same = idsOf(result.value).join('.') === idsOf(state.word).join('.');
        if (!same) dispatch({ type: 'replace', word: result.value });
      }),
    // Re-subscribes per edit so the comparison sees the current word; cheap.
    [fragments, dispatch, state.word],
  );

  if (message === null) return null;
  return (
    <div className={styles['notice']} role="status">
      <p className={styles['text']}>{message}</p>
      <button
        type="button"
        className={styles['dismiss']}
        onClick={() => {
          setMessage(null);
        }}
      >
        Dismiss
      </button>
    </div>
  );
}

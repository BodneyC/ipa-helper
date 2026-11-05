import { useId, useMemo, useState } from 'react';

import styles from './PasteDialog.module.css';
import { createIpaTokeniser } from '../../../domain/parse/ipa-tokeniser';
import type { UnknownCharacter } from '../../../domain/parse/ipa-tokeniser';
import { createIpaSerialiser } from '../../../domain/serialise/ipa';
import { useEditor, useSettings } from '../../../state/hooks';
import { useAnnounce } from '../../components/Announcer';
import { Dialog } from '../../components/Dialog';

interface PasteDialogProps {
  readonly open: boolean;
  readonly onClose: () => void;
}

/** How an unknown character is named: a space by name, a lone mark on ◌. */
const describe = ({ text, index }: UnknownCharacter): string => {
  const shown = /^\s$/u.test(text) ? 'a space' : /^\p{M}$/u.test(text) ? `‘◌${text}’` : `‘${text}’`;
  return `${shown} at position ${String(index + 1)}`;
};

/**
 * FR-17: paste (or type) IPA and use it as the word. It shows how the text
 * reads as you type, and names every character it doesn't know instead of
 * dropping it. Using the word is one undoable edit.
 */
export function PasteDialog({ open, onClose }: PasteDialogProps) {
  const { dispatch } = useEditor();
  const { settings } = useSettings();
  const announce = useAnnounce();
  const ids = { input: useId(), feedback: useId() };
  const [text, setText] = useState('');
  const { rDisplay } = settings;
  const tokenise = useMemo(() => createIpaTokeniser({ rDisplay }), [rDisplay]);
  const ipa = useMemo(() => createIpaSerialiser({ slashes: true, rDisplay }), [rDisplay]);
  const result = tokenise(text);
  const usable = result.ok && result.value.length > 0;

  const submit = () => {
    if (!result.ok || result.value.length === 0) return;
    dispatch({ type: 'replace', word: result.value });
    announce(`Word is now ${ipa.serialise(result.value)}`);
    setText('');
    onClose();
  };

  const feedback = !result.ok ? (
    <p id={ids.feedback} className={styles['error']}>
      Not recognised: {result.error.map(describe).join(', ')}.
    </p>
  ) : result.value.length === 0 ? (
    <p id={ids.feedback} className={styles['hint']}>
      For example <span className={styles['ipa']}>/ˈθɔːnɪk/</span>. Slashes or brackets around it
      are fine.
    </p>
  ) : (
    <p id={ids.feedback} className={styles['hint']}>
      Reads as <span className={styles['ipa']}>{ipa.serialise(result.value)}</span>,{' '}
      {result.value.length === 1 ? '1 symbol' : `${String(result.value.length)} symbols`}.
    </p>
  );

  return (
    <Dialog open={open} onClose={onClose} title="Paste IPA">
      <form
        className={styles['form']}
        onSubmit={(event) => {
          event.preventDefault();
          submit();
        }}
      >
        <label htmlFor={ids.input} className={styles['label']}>
          IPA text
        </label>
        <input
          id={ids.input}
          className={styles['text']}
          type="text"
          autoComplete="off"
          autoCapitalize="off"
          spellCheck={false}
          value={text}
          aria-invalid={!result.ok}
          aria-describedby={ids.feedback}
          onChange={(event) => {
            setText(event.target.value);
          }}
        />
        <div aria-live="polite">{feedback}</div>
        <div className={styles['actions']}>
          <button type="submit" className={styles['button']} disabled={!usable}>
            Use as word
          </button>
        </div>
      </form>
    </Dialog>
  );
}

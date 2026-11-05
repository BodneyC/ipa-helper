import { useEffect, useId, useReducer, useRef, useState } from 'react';
import type { KeyboardEvent } from 'react';

import styles from './SavedWordsDialog.module.css';
import { decodeWord, encodeWord } from '../../../domain/codec/url';
import { createIpaSerialiser } from '../../../domain/serialise/ipa';
import { useEditor, useServices, useSettings } from '../../../state/hooks';
import {
  GLOSS_MAX_LENGTH,
  loadSavedWords,
  saveSavedWords,
  savedWordsReducer,
} from '../../../state/saved-words';
import type { SavedWord } from '../../../state/saved-words';
import { glyphsOf } from '../../../state/settings';
import { useAnnounce } from '../../components/Announcer';
import { Dialog } from '../../components/Dialog';

interface SavedWordsDialogProps {
  readonly open: boolean;
  readonly onClose: () => void;
}

/** A fresh entry's ID and timestamp. Only called from event handlers. */
const stamp = () => ({ id: crypto.randomUUID(), savedAt: Date.now() });

/**
 * FR-16: save the current word with an optional gloss, and load, rename or
 * delete saved words. The list lives in local storage; loading a word is one
 * undoable edit.
 */
export function SavedWordsDialog({ open, onClose }: SavedWordsDialogProps) {
  const { state, dispatch: editorDispatch } = useEditor();
  const { settings } = useSettings();
  const { store } = useServices();
  const announce = useAnnounce();
  const [list, dispatch] = useReducer(savedWordsReducer, store, loadSavedWords);
  const [gloss, setGloss] = useState('');
  const [editing, setEditing] = useState<string | undefined>(undefined);
  const glossId = useId();
  const glossRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    saveSavedWords(store, list);
  }, [store, list]);

  const ipa = createIpaSerialiser({ slashes: true, ...glyphsOf(settings) });
  const ipaOf = (entry: SavedWord) => {
    const word = decodeWord(entry.fragment);
    return word.ok ? ipa.serialise(word.value) : '';
  };
  const empty = state.word.length === 0;

  const save = () => {
    if (empty) return;
    dispatch({
      type: 'add',
      entry: { ...stamp(), fragment: encodeWord(state.word), gloss },
    });
    setGloss('');
    announce(`Saved ${ipa.serialise(state.word)}`);
  };

  const load = (entry: SavedWord) => {
    const word = decodeWord(entry.fragment);
    if (!word.ok) return;
    editorDispatch({ type: 'replace', word: word.value });
    announce(`Loaded ${ipaOf(entry)}`);
    onClose();
  };

  const remove = (entry: SavedWord) => {
    dispatch({ type: 'remove', id: entry.id });
    announce(`Deleted ${ipaOf(entry)}`);
    glossRef.current?.focus();
  };

  return (
    <Dialog open={open} onClose={onClose} title="Saved words">
      <form
        className={styles['form']}
        onSubmit={(event) => {
          event.preventDefault();
          save();
        }}
      >
        <label htmlFor={glossId} className={styles['label']}>
          Gloss for {empty ? 'the current word' : ipa.serialise(state.word)} (optional)
        </label>
        <div className={styles['row']}>
          <input
            ref={glossRef}
            id={glossId}
            className={styles['text']}
            type="text"
            autoComplete="off"
            maxLength={GLOSS_MAX_LENGTH}
            value={gloss}
            onChange={(event) => {
              setGloss(event.target.value);
            }}
          />
          <button type="submit" className={styles['button']} disabled={empty}>
            Save current word
          </button>
        </div>
        {empty && <p className={styles['hint']}>Build a word first, then save it here.</p>}
      </form>

      {list.length === 0 ? (
        <p className={styles['hint']}>No saved words yet.</p>
      ) : (
        <ul className={styles['list']} aria-label="Saved words">
          {list.map((entry) => (
            <Entry
              key={entry.id}
              entry={entry}
              ipa={ipaOf(entry)}
              editing={editing === entry.id}
              onLoad={() => {
                load(entry);
              }}
              onEdit={() => {
                setEditing(entry.id);
              }}
              onRename={(newGloss) => {
                dispatch({ type: 'rename', id: entry.id, gloss: newGloss });
                setEditing(undefined);
              }}
              onCancel={() => {
                setEditing(undefined);
              }}
              onDelete={() => {
                remove(entry);
              }}
            />
          ))}
        </ul>
      )}
    </Dialog>
  );
}

interface EntryProps {
  readonly entry: SavedWord;
  readonly ipa: string;
  readonly editing: boolean;
  readonly onLoad: () => void;
  readonly onEdit: () => void;
  readonly onRename: (gloss: string) => void;
  readonly onCancel: () => void;
  readonly onDelete: () => void;
}

/** One saved word. Its buttons carry the word in their names, so each is unique in the list. */
function Entry({ entry, ipa, editing, onLoad, onEdit, onRename, onCancel, onDelete }: EntryProps) {
  const inputId = useId();
  const [draft, setDraft] = useState(entry.gloss);
  const renameRef = useRef<HTMLButtonElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const wasEditing = useRef(false);
  const which = entry.gloss === '' ? ipa : `${ipa} (${entry.gloss})`;

  // Focus follows the edit (WCAG 2.4.3): into the field, then back to Rename.
  useEffect(() => {
    if (editing) inputRef.current?.focus();
    else if (wasEditing.current) renameRef.current?.focus();
    wasEditing.current = editing;
  }, [editing]);

  const onKeyDown = (event: KeyboardEvent) => {
    // Escape cancels the rename, not the whole dialog.
    if (event.key !== 'Escape') return;
    event.preventDefault();
    event.stopPropagation();
    setDraft(entry.gloss);
    onCancel();
  };

  return (
    <li className={styles['entry']}>
      <span className={styles['ipa']}>{ipa}</span>
      {editing ? (
        <form
          className={styles['row']}
          onSubmit={(event) => {
            event.preventDefault();
            onRename(draft);
          }}
        >
          <label htmlFor={inputId} className="visuallyHidden">
            Gloss for {ipa}
          </label>
          <input
            id={inputId}
            className={styles['text']}
            type="text"
            autoComplete="off"
            maxLength={GLOSS_MAX_LENGTH}
            ref={inputRef}
            value={draft}
            onChange={(event) => {
              setDraft(event.target.value);
            }}
            onKeyDown={onKeyDown}
          />
          <button type="submit" className={styles['button']}>
            Save<span className="visuallyHidden"> gloss for {ipa}</span>
          </button>
          <button
            type="button"
            className={styles['button']}
            onClick={() => {
              setDraft(entry.gloss);
              onCancel();
            }}
          >
            Cancel
          </button>
        </form>
      ) : (
        <>
          <span className={entry.gloss === '' ? styles['noGloss'] : styles['gloss']}>
            {entry.gloss === '' ? 'No gloss' : entry.gloss}
          </span>
          <div className={styles['actions']}>
            <button type="button" className={styles['button']} onClick={onLoad}>
              Load<span className="visuallyHidden"> {which}</span>
            </button>
            <button ref={renameRef} type="button" className={styles['button']} onClick={onEdit}>
              Rename<span className="visuallyHidden"> {which}</span>
            </button>
            <button type="button" className={styles['danger']} onClick={onDelete}>
              Delete<span className="visuallyHidden"> {which}</span>
            </button>
          </div>
        </>
      )}
    </li>
  );
}

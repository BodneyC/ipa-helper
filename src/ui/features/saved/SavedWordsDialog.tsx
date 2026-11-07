import { useEffect, useId, useRef, useState } from 'react';
import type { KeyboardEvent } from 'react';

import styles from './SavedWordsDialog.module.css';
import { decodeWord, encodeWord } from '../../../domain/codec/url';
import { createIpaSerialiser } from '../../../domain/serialise/ipa';
import { useEditor, useServices, useSettings } from '../../../state/hooks';
import {
  exportSavedWords,
  GLOSS_MAX_LENGTH,
  importSavedWords,
  loadSavedWords,
  parseSavedWordsFile,
  SAVED_WORDS_STORAGE_KEY,
  updateSavedWords,
} from '../../../state/saved-words';
import type { SavedWord, SavedWordsAction, SavedWordsFileError } from '../../../state/saved-words';
import { glyphsOf } from '../../../state/settings';
import { useAnnounce } from '../../components/Announcer';
import { Dialog } from '../../components/Dialog';

interface SavedWordsDialogProps {
  readonly open: boolean;
  readonly onClose: () => void;
}

/** A fresh entry's ID and timestamp. Only called from event handlers. */
const stamp = () => ({ id: crypto.randomUUID(), savedAt: Date.now() });

/** `1 word`, `2 words`. */
const words = (n: number) => `${String(n)} word${n === 1 ? '' : 's'}`;

/** What an import did (FR-18), as shown and announced. */
export const importSummary = ({
  added,
  skipped,
  invalid,
}: {
  readonly added: number;
  readonly skipped: number;
  readonly invalid: number;
}): string =>
  [
    `Imported ${words(added)}.`,
    ...(skipped > 0 ? [`Skipped ${words(skipped)} already saved.`] : []),
    ...(invalid > 0 ? [`Left out ${words(invalid)} that couldn’t be read.`] : []),
  ].join(' ');

const FILE_ERRORS: Readonly<Record<SavedWordsFileError['kind'], string>> = {
  'not-saved-words': 'That file isn’t a saved-words export from ipa-helper.',
  'newer-version':
    'That file is from a newer version of ipa-helper. Reload to update, then try again.',
};

/**
 * FR-16: save the current word with an optional gloss, and load, rename or
 * delete saved words. The list lives in local storage; loading a word is one
 * undoable edit.
 *
 * FR-18: Export downloads the list as a versioned JSON file, and Import merges
 * one back in, skipping words already saved, and says what it did.
 *
 * Storage is the source of truth, shared by every tab (#2): each change is applied
 * to the stored list ({@link updateSavedWords}), and a change from another tab
 * reloads the list here.
 */
export function SavedWordsDialog({ open, onClose }: SavedWordsDialogProps) {
  const { state, dispatch: editorDispatch } = useEditor();
  const { settings } = useSettings();
  const { downloads, store } = useServices();
  const announce = useAnnounce();
  const [list, setList] = useState(() => loadSavedWords(store));
  const [gloss, setGloss] = useState('');
  const [editing, setEditing] = useState<string | undefined>(undefined);
  const glossId = useId();
  const glossRef = useRef<HTMLInputElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [transfer, setTransfer] = useState<string | undefined>(undefined);

  useEffect(
    () =>
      store.subscribe(SAVED_WORDS_STORAGE_KEY, () => {
        setList(loadSavedWords(store));
      }),
    [store],
  );

  const dispatch = (action: SavedWordsAction) => {
    setList(updateSavedWords(store, action));
  };

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

  const report = (message: string) => {
    setTransfer(message);
    announce(message);
  };

  const exportList = () => {
    const now = Date.now();
    const date = new Date(now).toISOString().slice(0, 10);
    downloads.saveText(
      `ipa-helper-saved-words-${date}.json`,
      exportSavedWords(list, now),
      'application/json',
    );
    report(`Exported ${words(list.length)}.`);
  };

  const importFile = async (file: File) => {
    let text: string;
    try {
      text = await file.text();
    } catch {
      report('Couldn’t read that file.');
      return;
    }
    const read = parseSavedWordsFile(text);
    if (!read.ok) {
      report(FILE_ERRORS[read.error.kind]);
      return;
    }
    const merged = importSavedWords(store, read.value.entries);
    setList(merged.list);
    report(
      importSummary({
        added: merged.added,
        skipped: merged.skipped + read.value.repeated,
        invalid: read.value.invalid,
      }),
    );
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

      <div className={styles['transfer']}>
        <button
          type="button"
          className={styles['button']}
          disabled={list.length === 0}
          onClick={exportList}
        >
          Export
        </button>
        <button
          type="button"
          className={styles['button']}
          onClick={() => {
            fileRef.current?.click();
          }}
        >
          Import…
        </button>
        {/* The picker behind Import…; it is not a control of its own. */}
        <input
          ref={fileRef}
          type="file"
          accept="application/json,.json"
          hidden
          aria-hidden="true"
          tabIndex={-1}
          onChange={(event) => {
            const file = event.target.files?.[0];
            // Clear it, so picking the same file again still imports it.
            event.target.value = '';
            if (file !== undefined) void importFile(file);
          }}
        />
        {transfer !== undefined && <p className={styles['hint']}>{transfer}</p>}
      </div>
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

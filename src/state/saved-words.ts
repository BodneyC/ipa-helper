import { decodeWord } from '../domain/codec/url';
import type { KeyValueStore } from '../domain/ports';
import { assertNever, err, ok } from '../domain/result';
import type { Result } from '../domain/result';

/** One saved word (FR-16). */
export interface SavedWord {
  /** Unique within the list. */
  readonly id: string;
  /** The word as a URL-codec fragment (`w=1:…`, ADR-0007), so it is versioned and validated. */
  readonly fragment: string;
  /** The user's label for it; may be empty. */
  readonly gloss: string;
  /** When it was saved, in ms since the epoch. */
  readonly savedAt: number;
}

/** Versioned storage key (ARCHITECTURE §5). */
export const SAVED_WORDS_STORAGE_KEY = 'ipa-helper:saved-words:v1';

/** Longest gloss kept, so one entry can't swamp the list. */
export const GLOSS_MAX_LENGTH = 80;

/** Trims and shortens a gloss. */
export const cleanGloss = (gloss: string): string => gloss.trim().slice(0, GLOSS_MAX_LENGTH);

const isRecord = (value: unknown): value is object => typeof value === 'object' && value !== null;
const get = (record: object, key: string): unknown =>
  Object.hasOwn(record, key) ? Reflect.get(record, key) : undefined;

/** A saved word from untrusted data, or `undefined` when it isn't one, or its word no longer decodes. */
const parseEntry = (value: unknown): SavedWord | undefined => {
  if (!isRecord(value)) return undefined;
  const id = get(value, 'id');
  const fragment = get(value, 'fragment');
  const gloss = get(value, 'gloss');
  const savedAt = get(value, 'savedAt');
  if (typeof id !== 'string' || id === '' || typeof fragment !== 'string') return undefined;
  if (typeof gloss !== 'string' || typeof savedAt !== 'number' || !Number.isFinite(savedAt)) {
    return undefined;
  }
  const word = decodeWord(fragment);
  if (!word.ok || word.value.length === 0) return undefined;
  return { id, fragment, gloss: cleanGloss(gloss), savedAt };
};

/**
 * Reads the saved list from untrusted data (parsed storage JSON). Invalid
 * entries, and repeats of an ID, are dropped; the rest are kept.
 */
export const parseSavedWords = (value: unknown): readonly SavedWord[] => {
  if (!Array.isArray(value)) return [];
  const seen = new Set<string>();
  return value.flatMap((item: unknown) => {
    const entry = parseEntry(item);
    if (entry === undefined || seen.has(entry.id)) return [];
    seen.add(entry.id);
    return [entry];
  });
};

/** Everything that can happen to the saved list. */
export type SavedWordsAction =
  | { readonly type: 'add'; readonly entry: SavedWord }
  | { readonly type: 'rename'; readonly id: string; readonly gloss: string }
  | { readonly type: 'remove'; readonly id: string };

/** The pure saved-words reducer (FR-16). Newest first. */
export const savedWordsReducer = (
  state: readonly SavedWord[],
  action: SavedWordsAction,
): readonly SavedWord[] => {
  switch (action.type) {
    case 'add': {
      const entry = parseEntry(action.entry);
      if (entry === undefined || state.some((e) => e.id === entry.id)) return state;
      return [entry, ...state];
    }
    case 'rename':
      return state.map((e) => (e.id === action.id ? { ...e, gloss: cleanGloss(action.gloss) } : e));
    case 'remove':
      return state.filter((e) => e.id !== action.id);
    default:
      return assertNever(action);
  }
};

/** Reads the saved list (FR-16). Missing or corrupt data reads as empty. */
export const loadSavedWords = (store: KeyValueStore): readonly SavedWord[] => {
  const raw = store.get(SAVED_WORDS_STORAGE_KEY);
  if (raw === undefined) return [];
  try {
    return parseSavedWords(JSON.parse(raw));
  } catch {
    return [];
  }
};

/** Stores the saved list (FR-16). */
export const saveSavedWords = (store: KeyValueStore, words: readonly SavedWord[]): void => {
  store.set(SAVED_WORDS_STORAGE_KEY, JSON.stringify(words));
};

/**
 * Applies one change to the *stored* list and returns the result (FR-16, #2).
 * It re-reads storage first, so a change made in another tab since this tab
 * last looked is kept rather than overwritten: adds, renames and removes from
 * different tabs merge by entry ID.
 */
export const updateSavedWords = (
  store: KeyValueStore,
  action: SavedWordsAction,
): readonly SavedWord[] => {
  const next = savedWordsReducer(loadSavedWords(store), action);
  saveSavedWords(store, next);
  return next;
};

/** What a saved-words file says it is (FR-18). */
const SAVED_WORDS_FILE_FORMAT = 'ipa-helper/saved-words';
/** The file version this build writes; it reads this one and older (ARCHITECTURE §5). */
const SAVED_WORDS_FILE_VERSION = 1;
/** Largest file read, in characters, so a wrong pick can't hang the tab. */
export const SAVED_WORDS_FILE_MAX_LENGTH = 5_000_000;

/** The exported file: the saved list in a versioned envelope (FR-18). */
export const exportSavedWords = (words: readonly SavedWord[], exportedAt: number): string =>
  `${JSON.stringify(
    {
      format: SAVED_WORDS_FILE_FORMAT,
      version: SAVED_WORDS_FILE_VERSION,
      exportedAt: new Date(exportedAt).toISOString(),
      words,
    },
    null,
    2,
  )}\n`;

/** Why a file couldn't be imported at all (FR-18). */
export type SavedWordsFileError =
  /** Not JSON, too big, or not a saved-words file. */
  | { readonly kind: 'not-saved-words' }
  /** A saved-words file from a newer version of the app. */
  | { readonly kind: 'newer-version'; readonly version: number };

/** The words read from a file. */
export interface SavedWordsFile {
  /** Valid entries, each ID once (via {@link parseSavedWords}). */
  readonly entries: readonly SavedWord[];
  /** Entries that aren't saved words, or whose word no longer decodes. */
  readonly invalid: number;
  /** Entries that repeat an ID earlier in the file. */
  readonly repeated: number;
}

/** Reads an exported file (FR-18). The text is untrusted: every entry goes through {@link parseSavedWords}. */
export const parseSavedWordsFile = (text: string): Result<SavedWordsFile, SavedWordsFileError> => {
  if (text.length > SAVED_WORDS_FILE_MAX_LENGTH) return err({ kind: 'not-saved-words' });
  let value: unknown;
  try {
    value = JSON.parse(text);
  } catch {
    return err({ kind: 'not-saved-words' });
  }
  if (!isRecord(value) || get(value, 'format') !== SAVED_WORDS_FILE_FORMAT) {
    return err({ kind: 'not-saved-words' });
  }
  const version = get(value, 'version');
  if (typeof version !== 'number' || !Number.isInteger(version) || version < 1) {
    return err({ kind: 'not-saved-words' });
  }
  if (version > SAVED_WORDS_FILE_VERSION) return err({ kind: 'newer-version', version });
  const words = get(value, 'words');
  if (!Array.isArray(words)) return err({ kind: 'not-saved-words' });
  const entries = parseSavedWords(words);
  const invalid = words.filter((item: unknown) => parseSavedWords([item]).length === 0).length;
  return ok({ entries, invalid, repeated: words.length - invalid - entries.length });
};

/** The result of merging imported words into the list. */
export interface SavedWordsMerge {
  readonly list: readonly SavedWord[];
  readonly added: number;
  /** Entries already in the list. */
  readonly skipped: number;
}

/**
 * Merges imported entries into the list (FR-18). An entry is already there
 * when the list has its ID, or the same word with the same gloss (an entry
 * repeating an ID earlier in the import counts too); it is skipped, so the list's own copy (and any rename) wins. The result is newest
 * first, by when each word was saved.
 */
export const mergeSavedWords = (
  list: readonly SavedWord[],
  entries: readonly SavedWord[],
): SavedWordsMerge => {
  const ids = new Set(list.map((e) => e.id));
  const words = new Set(list.map((e) => `${e.fragment}\n${e.gloss}`));
  // Only the list's words count: a file may hold the same word twice, as the list can.
  const fresh = entries.filter((e) => {
    if (ids.has(e.id) || words.has(`${e.fragment}\n${e.gloss}`)) return false;
    ids.add(e.id);
    return true;
  });
  return {
    list: [...list, ...fresh].toSorted((a, b) => b.savedAt - a.savedAt),
    added: fresh.length,
    skipped: entries.length - fresh.length,
  };
};

/**
 * Imports entries into the *stored* list (FR-18), re-reading it first as
 * {@link updateSavedWords} does, so another tab's changes are kept.
 */
export const importSavedWords = (
  store: KeyValueStore,
  entries: readonly SavedWord[],
): SavedWordsMerge => {
  const merged = mergeSavedWords(loadSavedWords(store), entries);
  saveSavedWords(store, merged.list);
  return merged;
};

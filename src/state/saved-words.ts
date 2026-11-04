import { decodeWord } from '../domain/codec/url';
import type { KeyValueStore } from '../domain/ports';
import { assertNever } from '../domain/result';

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

import fc from 'fast-check';
import { describe, expect, it } from 'vitest';

import {
  cleanGloss,
  GLOSS_MAX_LENGTH,
  loadSavedWords,
  parseSavedWords,
  SAVED_WORDS_STORAGE_KEY,
  saveSavedWords,
  savedWordsReducer,
  updateSavedWords,
} from './saved-words';
import type { SavedWord } from './saved-words';
import type { KeyValueStore } from '../domain/ports';

const memoryStore = (initial: Record<string, string> = {}): KeyValueStore => {
  const data = new Map(Object.entries(initial));
  return {
    get: (k) => data.get(k),
    set: (k, v) => void data.set(k, v),
    subscribe: () => () => undefined,
  };
};

const entry = (id: string, gloss = '', fragment = 'w=1:f.l.turned-script-a.g'): SavedWord => ({
  id,
  fragment,
  gloss,
  savedAt: 1_700_000_000_000,
});

const anyEntry: fc.Arbitrary<SavedWord> = fc.record({
  id: fc.uuid(),
  fragment: fc.constantFrom('w=1:esh.i.p', 'w=1:primary-stress.theta.open-o-long.n.small-cap-i.k'),
  gloss: fc.string({ maxLength: GLOSS_MAX_LENGTH }).map(cleanGloss),
  savedAt: fc.integer({ min: 0 }),
});

describe('saved words (FR-16)', () => {
  it('adds newest first, renames and removes', () => {
    let list = savedWordsReducer([], { type: 'add', entry: entry('a', 'flog') });
    list = savedWordsReducer(list, { type: 'add', entry: entry('b') });
    expect(list.map((e) => e.id)).toEqual(['b', 'a']);
    list = savedWordsReducer(list, { type: 'rename', id: 'b', gloss: '  dog-ish  ' });
    expect(list[0]?.gloss).toBe('dog-ish');
    list = savedWordsReducer(list, { type: 'remove', id: 'a' });
    expect(list.map((e) => e.id)).toEqual(['b']);
  });

  it('ignores adding an empty or invalid word, or a repeated ID', () => {
    const list = [entry('a')];
    expect(savedWordsReducer(list, { type: 'add', entry: entry('b', '', '') })).toBe(list);
    expect(savedWordsReducer(list, { type: 'add', entry: entry('b', '', 'w=1:nope') })).toBe(list);
    expect(savedWordsReducer(list, { type: 'add', entry: entry('a') })).toBe(list);
  });

  it('trims glosses and caps their length', () => {
    expect(cleanGloss('  x  ')).toBe('x');
    expect(cleanGloss('y'.repeat(200))).toHaveLength(GLOSS_MAX_LENGTH);
  });

  it('round-trips any list through a store', () => {
    fc.assert(
      fc.property(fc.uniqueArray(anyEntry, { selector: (e) => e.id }), (list) => {
        const store = memoryStore();
        saveSavedWords(store, list);
        expect(loadSavedWords(store)).toEqual(list);
      }),
    );
  });

  it('reads missing or corrupt storage as empty', () => {
    expect(loadSavedWords(memoryStore())).toEqual([]);
    expect(loadSavedWords(memoryStore({ [SAVED_WORDS_STORAGE_KEY]: '{oops' }))).toEqual([]);
    expect(parseSavedWords({ not: 'a list' })).toEqual([]);
  });

  it('keeps the valid entries of partly bad data', () => {
    const good = entry('ok', 'fine');
    const raw: unknown[] = [
      good,
      null,
      { ...good, id: '' },
      { ...good, id: 'n', savedAt: Number.NaN },
      { ...good, id: 'g', gloss: 3 },
      { ...good, id: 'f', fragment: 7 },
      { ...good, id: 'u', fragment: 'w=1:not-a-symbol' },
      { ...good, id: 'e', fragment: 'w=1:' },
      { ...good, gloss: 'duplicate id' },
    ];
    expect(parseSavedWords(raw)).toEqual([good]);
  });
});

describe('saved words in two tabs (FR-16, #2)', () => {
  const ids = (store: KeyValueStore) => loadSavedWords(store).map((e) => e.id);

  it('keeps an add from each tab', () => {
    const store = memoryStore();
    updateSavedWords(store, { type: 'add', entry: entry('a') });
    updateSavedWords(store, { type: 'add', entry: entry('b') });
    expect(ids(store)).toEqual(['b', 'a']);
  });

  it('merges a rename in one tab with an add and a remove in the other', () => {
    const store = memoryStore();
    saveSavedWords(store, [entry('a', 'one'), entry('b', 'two')]);
    // Tab A renames a; tab B, which loaded the same list earlier, adds c and removes b.
    updateSavedWords(store, { type: 'rename', id: 'a', gloss: 'uno' });
    updateSavedWords(store, { type: 'add', entry: entry('c') });
    updateSavedWords(store, { type: 'remove', id: 'b' });
    expect(loadSavedWords(store).map((e) => [e.id, e.gloss])).toEqual([
      ['c', ''],
      ['a', 'uno'],
    ]);
  });

  it('ignores renaming or removing an entry another tab already removed', () => {
    const store = memoryStore();
    saveSavedWords(store, [entry('a')]);
    updateSavedWords(store, { type: 'remove', id: 'a' });
    expect(updateSavedWords(store, { type: 'rename', id: 'a', gloss: 'x' })).toEqual([]);
    expect(updateSavedWords(store, { type: 'remove', id: 'a' })).toEqual([]);
  });

  it('returns what it stored', () => {
    const store = memoryStore();
    const list = updateSavedWords(store, { type: 'add', entry: entry('a', 'flog') });
    expect(loadSavedWords(store)).toEqual(list);
  });

  it('keeps every word added through the store, however many', () => {
    fc.assert(
      fc.property(fc.uniqueArray(anyEntry, { selector: (e) => e.id, maxLength: 12 }), (added) => {
        const store = memoryStore();
        for (const e of added) updateSavedWords(store, { type: 'add', entry: e });
        expect(new Set(ids(store))).toEqual(new Set(added.map((e) => e.id)));
      }),
    );
  });
});

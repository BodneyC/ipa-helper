import fc from 'fast-check';
import { describe, expect, it } from 'vitest';

import {
  cleanGloss,
  exportSavedWords,
  GLOSS_MAX_LENGTH,
  importSavedWords,
  loadSavedWords,
  mergeSavedWords,
  parseSavedWords,
  parseSavedWordsFile,
  SAVED_WORDS_FILE_MAX_LENGTH,
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

describe('saved words files (FR-18)', () => {
  const file = (words: unknown, extra: Record<string, unknown> = {}) =>
    JSON.stringify({ format: 'ipa-helper/saved-words', version: 1, words, ...extra });

  it('exports a versioned, readable file', () => {
    const text = exportSavedWords([entry('a', 'flog')], Date.UTC(2026, 10, 7));
    expect(JSON.parse(text)).toEqual({
      format: 'ipa-helper/saved-words',
      version: 1,
      exportedAt: '2026-11-07T00:00:00.000Z',
      words: [entry('a', 'flog')],
    });
    expect(text.endsWith('}\n')).toBe(true);
  });

  it('property: export then import into an empty list restores every word', () => {
    fc.assert(
      fc.property(fc.uniqueArray(anyEntry, { selector: (e) => e.id }), fc.nat(), (words, at) => {
        const read = parseSavedWordsFile(exportSavedWords(words, at));
        expect(read).toEqual({ ok: true, value: { entries: words, invalid: 0, repeated: 0 } });
        if (!read.ok) return;
        const merged = mergeSavedWords([], read.value.entries);
        expect(merged.list.toSorted((a, b) => a.id.localeCompare(b.id))).toEqual(
          words.toSorted((a, b) => a.id.localeCompare(b.id)),
        );
        // Importing the same file again adds nothing.
        const again = mergeSavedWords(merged.list, read.value.entries);
        expect(again).toEqual({ list: merged.list, added: 0, skipped: words.length });
      }),
    );
  });

  it('counts invalid entries and repeated IDs, and keeps the rest', () => {
    const read = parseSavedWordsFile(
      file([entry('a'), { id: 'b' }, entry('c', '', 'w=1:no-such-symbol'), entry('a', 'again'), 7]),
    );
    expect(read).toEqual({ ok: true, value: { entries: [entry('a')], invalid: 3, repeated: 1 } });
  });

  it('rejects anything that is not a saved-words file, and files from a newer version', () => {
    const notOurs = { ok: false, error: { kind: 'not-saved-words' } };
    expect(parseSavedWordsFile('not json')).toEqual(notOurs);
    expect(parseSavedWordsFile('[]')).toEqual(notOurs);
    expect(parseSavedWordsFile(JSON.stringify({ format: 'other', version: 1, words: [] }))).toEqual(
      notOurs,
    );
    expect(parseSavedWordsFile(file([], { version: 0 }))).toEqual(notOurs);
    expect(parseSavedWordsFile(file([], { version: '1' }))).toEqual(notOurs);
    expect(parseSavedWordsFile(file({}))).toEqual(notOurs);
    expect(parseSavedWordsFile(' '.repeat(SAVED_WORDS_FILE_MAX_LENGTH + 1))).toEqual(notOurs);
    expect(parseSavedWordsFile(file([], { version: 2 }))).toEqual({
      ok: false,
      error: { kind: 'newer-version', version: 2 },
    });
  });

  it('skips an entry already saved, by ID or by the same word and gloss in the list, newest first', () => {
    const list = [{ ...entry('a', 'renamed'), savedAt: 3 }];
    const merged = mergeSavedWords(list, [
      { ...entry('a', 'old'), savedAt: 3 },
      { ...entry('b', 'renamed'), savedAt: 2 },
      { ...entry('c', 'new'), savedAt: 5 },
      { ...entry('d', 'new'), savedAt: 1 },
    ]);
    // c and d are the same word and gloss, but the list may hold both, so both come in.
    expect(merged.list.map((e) => e.id)).toEqual(['c', 'a', 'd']);
    expect(merged).toMatchObject({ added: 2, skipped: 2 });
    expect(mergeSavedWords([], [entry('x'), entry('x')])).toMatchObject({ added: 1, skipped: 1 });
  });

  it('imports into the stored list, keeping what another tab saved', () => {
    const store = memoryStore();
    saveSavedWords(store, [entry('other-tab', 'kept')]);
    const merged = importSavedWords(store, [{ ...entry('new', 'imported'), savedAt: 1 }]);
    expect(merged.added).toBe(1);
    expect(loadSavedWords(store).map((e) => e.id)).toEqual(['other-tab', 'new']);
  });
});

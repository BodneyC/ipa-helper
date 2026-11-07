import fc from 'fast-check';
import { describe, expect, it } from 'vitest';

import {
  CONTRASTS,
  DEFAULT_SETTINGS,
  SETTINGS_STORAGE_KEY,
  THEMES,
  isMacroName,
  isSettings,
  loadSettings,
  mergeSettings,
  parseSettings,
  sameSettings,
  saveSettings,
  settingsReducer,
} from './settings';
import type { Settings } from './settings';
import type { KeyValueStore } from '../domain/ports';

/** An in-memory KeyValueStore. */
const memoryStore = (initial: Record<string, string> = {}): KeyValueStore => {
  const data = new Map(Object.entries(initial));
  return {
    get: (k) => data.get(k),
    set: (k, v) => void data.set(k, v),
    subscribe: () => () => undefined,
  };
};

const custom: Settings = {
  theme: 'light',
  contrast: 'hard',
  inventory: 'extended',
  macroName: 'IPA',
  ipaSlashes: false,
  tipaSlashes: true,
  minimalBraces: true,
  rDisplay: 'broad',
  tieBars: true,
  collapsedGroups: ['vowel', 'diphthong'],
  soundOnSelect: true,
  hoverableTooltips: true,
  wordDetailsOpen: false,
};

const anySettings: fc.Arbitrary<Settings> = fc.record({
  theme: fc.constantFrom(...THEMES),
  contrast: fc.constantFrom(...CONTRASTS),
  inventory: fc.constantFrom('rp', 'extended'),
  macroName: fc.stringMatching(/^[a-zA-Z]{1,12}$/),
  ipaSlashes: fc.boolean(),
  tipaSlashes: fc.boolean(),
  minimalBraces: fc.boolean(),
  rDisplay: fc.constantFrom('narrow', 'broad'),
  tieBars: fc.boolean(),
  collapsedGroups: fc.subarray(['consonant', 'affricate', 'vowel'] as const),
  soundOnSelect: fc.boolean(),
  hoverableTooltips: fc.boolean(),
  wordDetailsOpen: fc.boolean(),
});

describe('settings schema', () => {
  it('FR-42: stores settings under a versioned key', () => {
    expect(SETTINGS_STORAGE_KEY).toBe('ipa-helper:settings:v1');
  });

  it('FR-40/FR-21: defaults to the system theme, medium contrast, RP and \\ipa', () => {
    expect(DEFAULT_SETTINGS).toEqual({
      theme: 'system',
      contrast: 'medium',
      inventory: 'rp',
      macroName: 'ipa',
      ipaSlashes: true,
      tipaSlashes: false,
      minimalBraces: false,
      rDisplay: 'narrow',
      tieBars: false,
      collapsedGroups: [],
      soundOnSelect: false,
      hoverableTooltips: false,
      wordDetailsOpen: true,
    });
    expect(isSettings(DEFAULT_SETTINGS)).toBe(true);
  });

  it('recognises valid settings and rejects anything else', () => {
    expect(isSettings(custom)).toBe(true);
    for (const bad of [
      null,
      'settings',
      42,
      [],
      {},
      { ...custom, theme: 'solarized' },
      { ...custom, macroName: 'ipa2' },
      { ...custom, macroName: '' },
      { ...custom, collapsedGroups: ['vowel', 'nope'] },
      { ...custom, collapsedGroups: 'vowel' },
      { ...custom, soundOnSelect: 'yes' },
      { ...custom, wordDetailsOpen: 1 },
    ]) {
      expect(isSettings(bad)).toBe(false);
    }
  });

  it('accepts only letters as a macro name (it follows a backslash)', () => {
    expect(isMacroName('ipa')).toBe(true);
    expect(isMacroName('textipa')).toBe(true);
    for (const bad of ['', 'ip a', 'ipa1', '\\ipa', 'ipa{', 7])
      expect(isMacroName(bad)).toBe(false);
  });

  it('round-trips through JSON', () => {
    fc.assert(
      fc.property(anySettings, (settings) => {
        const stored: unknown = JSON.parse(JSON.stringify(settings));
        expect(isSettings(stored)).toBe(true);
        expect(parseSettings(stored)).toEqual(settings);
      }),
    );
  });

  it('keeps valid fields and defaults invalid or missing ones', () => {
    expect(parseSettings({ theme: 'light', contrast: 'neon', macroName: 'x y' })).toEqual({
      ...DEFAULT_SETTINGS,
      theme: 'light',
    });
    expect(parseSettings(null)).toEqual(DEFAULT_SETTINGS);
    expect(parseSettings('garbage')).toEqual(DEFAULT_SETTINGS);
  });

  it('ignores inherited properties', () => {
    const inherited: unknown = Object.create({ theme: 'light' });
    expect(parseSettings(inherited)).toEqual(DEFAULT_SETTINGS);
  });

  it('never throws, and always returns valid settings, for any JSON', () => {
    fc.assert(
      fc.property(fc.jsonValue(), (value) => {
        expect(isSettings(parseSettings(value))).toBe(true);
      }),
    );
  });
});

describe('settings reducer', () => {
  it('FR-42: updates settings', () => {
    const s = settingsReducer(DEFAULT_SETTINGS, {
      type: 'update',
      patch: { theme: 'dark', macroName: 'phon' },
    });
    expect(s).toEqual({ ...DEFAULT_SETTINGS, theme: 'dark', macroName: 'phon' });
  });

  it('FR-21: leaves the macro name unchanged when the new one is invalid', () => {
    const s = settingsReducer(custom, { type: 'update', patch: { macroName: 'ipa 2' } });
    expect(s.macroName).toBe('IPA');
  });

  it('FR-5: toggles a palette group between collapsed and expanded', () => {
    const collapsed = settingsReducer(DEFAULT_SETTINGS, { type: 'toggleGroup', group: 'vowel' });
    expect(collapsed.collapsedGroups).toEqual(['vowel']);
    const expanded = settingsReducer(collapsed, { type: 'toggleGroup', group: 'vowel' });
    expect(expanded.collapsedGroups).toEqual([]);
  });

  it('resets to the defaults', () => {
    expect(settingsReducer(custom, { type: 'reset' })).toBe(DEFAULT_SETTINGS);
  });

  it('throws on an unknown action, as untyped data could carry', () => {
    // @ts-expect-error: deliberately not a SettingsAction.
    expect(() => settingsReducer(custom, { type: 'bogus' })).toThrow('Unexpected value');
  });
});

describe('settings persistence (FR-42)', () => {
  it('round-trips any settings through a store', () => {
    fc.assert(
      fc.property(anySettings, (settings) => {
        const store = memoryStore();
        saveSettings(store, settings);
        expect(loadSettings(store)).toEqual(settings);
      }),
    );
  });

  it('stores JSON under the versioned key the no-flash script reads', () => {
    const store = memoryStore();
    saveSettings(store, custom);
    expect(JSON.parse(store.get(SETTINGS_STORAGE_KEY) ?? '')).toEqual(custom);
  });

  it('falls back to the defaults for nothing stored or corrupt JSON', () => {
    expect(loadSettings(memoryStore())).toBe(DEFAULT_SETTINGS);
    expect(loadSettings(memoryStore({ [SETTINGS_STORAGE_KEY]: '{not json' }))).toBe(
      DEFAULT_SETTINGS,
    );
  });

  it('keeps the valid fields of partly bad data', () => {
    const raw = JSON.stringify({ theme: 'light', macroName: 'no digits 1' });
    expect(loadSettings(memoryStore({ [SETTINGS_STORAGE_KEY]: raw }))).toEqual({
      ...DEFAULT_SETTINGS,
      theme: 'light',
    });
  });
});

describe('settings in two tabs (FR-42, #2)', () => {
  it("keeps another tab's change to one field and this tab's change to another", () => {
    const base = DEFAULT_SETTINGS;
    const stored = { ...DEFAULT_SETTINGS, theme: 'dark' as const };
    const next = { ...DEFAULT_SETTINGS, inventory: 'extended' as const };
    expect(mergeSettings(stored, base, next)).toEqual({
      ...DEFAULT_SETTINGS,
      theme: 'dark',
      inventory: 'extended',
    });
  });

  it('lets the stored value win a field both tabs changed', () => {
    const stored = { ...DEFAULT_SETTINGS, collapsedGroups: ['vowel' as const] };
    const next = { ...DEFAULT_SETTINGS, collapsedGroups: ['consonant' as const] };
    expect(mergeSettings(stored, DEFAULT_SETTINGS, next).collapsedGroups).toEqual(['vowel']);
  });

  it("is this tab's settings when storage hasn't changed (including storage that drops writes)", () => {
    fc.assert(
      fc.property(anySettings, anySettings, (base, next) => {
        expect(mergeSettings(base, base, next)).toEqual(next);
      }),
    );
  });

  it('is the stored settings when this tab has changed nothing since base', () => {
    fc.assert(
      fc.property(anySettings, anySettings, (stored, base) => {
        expect(mergeSettings(stored, base, base)).toEqual(stored);
      }),
    );
  });

  it('compares settings by value', () => {
    expect(sameSettings(custom, { ...custom, collapsedGroups: [...custom.collapsedGroups] })).toBe(
      true,
    );
    expect(sameSettings(custom, DEFAULT_SETTINGS)).toBe(false);
  });
});

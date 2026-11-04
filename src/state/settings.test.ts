import fc from 'fast-check';
import { describe, expect, it } from 'vitest';

import {
  CONTRASTS,
  DEFAULT_SETTINGS,
  SETTINGS_STORAGE_KEY,
  THEMES,
  isMacroName,
  isSettings,
  parseSettings,
  settingsReducer,
} from './settings';
import type { Settings } from './settings';

const custom: Settings = {
  theme: 'light',
  contrast: 'hard',
  inventory: 'extended',
  macroName: 'IPA',
  ipaSlashes: false,
  tipaSlashes: true,
  rDisplay: 'broad',
  collapsedGroups: ['vowel', 'diphthong'],
  soundOnSelect: true,
};

const anySettings: fc.Arbitrary<Settings> = fc.record({
  theme: fc.constantFrom(...THEMES),
  contrast: fc.constantFrom(...CONTRASTS),
  inventory: fc.constantFrom('rp', 'extended'),
  macroName: fc.stringMatching(/^[a-zA-Z]{1,12}$/),
  ipaSlashes: fc.boolean(),
  tipaSlashes: fc.boolean(),
  rDisplay: fc.constantFrom('narrow', 'broad'),
  collapsedGroups: fc.subarray(['consonant', 'affricate', 'vowel'] as const),
  soundOnSelect: fc.boolean(),
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
      rDisplay: 'narrow',
      collapsedGroups: [],
      soundOnSelect: false,
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

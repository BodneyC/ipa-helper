import { CATEGORIES, INVENTORY_IDS } from '../domain/inventory/types';
import type { Category, InventoryId } from '../domain/inventory/types';
import { assertNever } from '../domain/result';
import type { RDisplay } from '../domain/serialise/serialiser';

/** FR-40: `system` follows `prefers-color-scheme`; the others override it. */
export const THEMES = ['system', 'dark', 'light'] as const;
/** A theme choice. */
type Theme = (typeof THEMES)[number];

/** FR-41: Gruvbox background contrast variants. */
export const CONTRASTS = ['soft', 'medium', 'hard'] as const;
/** A contrast choice. */
type Contrast = (typeof CONTRASTS)[number];

const R_DISPLAYS = ['narrow', 'broad'] as const satisfies readonly RDisplay[];

/** Every user setting (FR-42). Persisted under {@link SETTINGS_STORAGE_KEY}. */
export interface Settings {
  readonly theme: Theme;
  readonly contrast: Contrast;
  /** FR-3: which inventory the palette shows. */
  readonly inventory: InventoryId;
  /** FR-21: the user's LaTeX macro, without the backslash, e.g. `ipa` for `\ipa{…}`. */
  readonly macroName: string;
  /** FR-20: include `/…/` when copying the IPA. */
  readonly ipaSlashes: boolean;
  /** Q-2: include `/…/` inside the copied `\ipa{…}` argument. */
  readonly tipaSlashes: boolean;
  /** Q-3: display the British r as `ɹ` (narrow) or `r` (broad). */
  readonly rDisplay: RDisplay;
  /** FR-5: palette groups the user has collapsed. */
  readonly collapsedGroups: readonly Category[];
  /** FR-34: play each symbol as it is added. */
  readonly soundOnSelect: boolean;
}

/** Versioned storage key (ARCHITECTURE §5). A breaking schema change bumps it. */
export const SETTINGS_STORAGE_KEY = 'ipa-helper:settings:v1';

/** Settings on first visit. */
export const DEFAULT_SETTINGS: Settings = {
  theme: 'system',
  contrast: 'medium',
  inventory: 'rp',
  macroName: 'ipa',
  ipaSlashes: true,
  tipaSlashes: false,
  rDisplay: 'narrow',
  collapsedGroups: [],
  soundOnSelect: false,
};

const oneOf =
  <T extends string>(values: readonly T[]) =>
  (value: unknown): value is T =>
    values.some((v) => v === value);

const isBoolean = (value: unknown): value is boolean => typeof value === 'boolean';

/**
 * True when `value` can follow a backslash as a TeX control word: letters only,
 * so `\ipa{…}` can't be broken by the name.
 */
export const isMacroName = (value: unknown): value is string =>
  typeof value === 'string' && /^[a-zA-Z]+$/.test(value);

const isCategory = oneOf(CATEGORIES);
const isCategoryList = (value: unknown): value is readonly Category[] =>
  Array.isArray(value) && value.every(isCategory);

/** One type guard per setting. The mapped type makes sure none is missing. */
const validators: { readonly [K in keyof Settings]: (value: unknown) => value is Settings[K] } = {
  theme: oneOf(THEMES),
  contrast: oneOf(CONTRASTS),
  inventory: oneOf(INVENTORY_IDS),
  macroName: isMacroName,
  ipaSlashes: isBoolean,
  tipaSlashes: isBoolean,
  rDisplay: oneOf(R_DISPLAYS),
  collapsedGroups: isCategoryList,
  soundOnSelect: isBoolean,
};

const isRecord = (value: unknown): value is object => typeof value === 'object' && value !== null;

const field = (record: object, key: string): unknown =>
  Object.hasOwn(record, key) ? Reflect.get(record, key) : undefined;

/** True when `value` is a complete, valid {@link Settings} object. */
export const isSettings = (value: unknown): value is Settings =>
  isRecord(value) && Object.entries(validators).every(([key, valid]) => valid(field(value, key)));

/**
 * Reads settings from untrusted data (parsed storage JSON), field by field. A
 * missing or invalid field takes its value from `fallback`, so one bad or newer
 * field doesn't throw away the rest.
 */
export const parseSettings = (value: unknown, fallback: Settings = DEFAULT_SETTINGS): Settings => {
  const record = isRecord(value) ? value : {};
  const pick = <K extends keyof Settings>(key: K): Settings[K] => {
    const candidate = field(record, key);
    return validators[key](candidate) ? candidate : fallback[key];
  };
  return {
    theme: pick('theme'),
    contrast: pick('contrast'),
    inventory: pick('inventory'),
    macroName: pick('macroName'),
    ipaSlashes: pick('ipaSlashes'),
    tipaSlashes: pick('tipaSlashes'),
    rDisplay: pick('rDisplay'),
    collapsedGroups: pick('collapsedGroups'),
    soundOnSelect: pick('soundOnSelect'),
  };
};

/** Everything that can happen to the settings. */
export type SettingsAction =
  | { readonly type: 'update'; readonly patch: Partial<Settings> }
  | { readonly type: 'toggleGroup'; readonly group: Category }
  | { readonly type: 'reset' };

/**
 * The pure settings reducer. Updates go through {@link parseSettings}, so an
 * invalid value (say, a macro name with a digit) leaves that setting unchanged.
 */
export const settingsReducer = (state: Settings, action: SettingsAction): Settings => {
  switch (action.type) {
    case 'update':
      return parseSettings({ ...state, ...action.patch }, state);
    case 'toggleGroup':
      return {
        ...state,
        collapsedGroups: state.collapsedGroups.includes(action.group)
          ? state.collapsedGroups.filter((g) => g !== action.group)
          : [...state.collapsedGroups, action.group],
      };
    case 'reset':
      return DEFAULT_SETTINGS;
    default:
      return assertNever(action);
  }
};

// Pure logic for picking symbol clips by ear, a set at a time: the ways Cori is
// asked to say each sound, and the maintainer's picks and comments. No I/O here.
// Sets: the RP vowels (re-picked, #41) and the full-IPA-only sounds (#14).
import { soundingSymbols } from './clips';
import { isSounding, symbolsIn } from '../../src/domain/inventory/index';
import type { PhoneSymbol } from '../../src/domain/inventory/types';

/** One way of asking the voice for a sound. `V` in `text` stands for the sound. */
interface Variant {
  readonly key: string;
  readonly label: string;
  /** What the voice is given, with the sound as `V`. Stress goes before the vowel (ADR-0009). */
  readonly text: string;
  /** Piper's length_scale: 1 is the voice's own pace, higher is slower. */
  readonly lengthScale: number;
  /** True when a vowel's render has other sounds too, which a clip would keep. */
  readonly withConsonants?: boolean;
}

/**
 * The renderings offered for every vowel. The voice samples noise, so the
 * RP recipe (`ˈV!`) is offered three times to compare takes.
 */
export const VARIANTS: readonly Variant[] = [
  { key: 'bang-1', label: 'stressed, ! (RP recipe), take 1', text: 'ˈV!', lengthScale: 1 },
  { key: 'bang-2', label: 'stressed, ! (RP recipe), take 2', text: 'ˈV!', lengthScale: 1 },
  { key: 'bang-3', label: 'stressed, ! (RP recipe), take 3', text: 'ˈV!', lengthScale: 1 },
  { key: 'full-stop', label: 'stressed, full stop', text: 'ˈV.', lengthScale: 1 },
  { key: 'question', label: 'stressed, question mark', text: 'ˈV?', lengthScale: 1 },
  { key: 'comma', label: 'stressed, comma', text: 'ˈV,', lengthScale: 1 },
  { key: 'semicolon', label: 'stressed, semicolon', text: 'ˈV;', lengthScale: 1 },
  { key: 'colon', label: 'stressed, colon', text: 'ˈV:', lengthScale: 1 },
  { key: 'ellipsis', label: 'stressed, ...', text: 'ˈV...', lengthScale: 1 },
  { key: 'bare', label: 'stressed, no punctuation', text: 'ˈV', lengthScale: 1 },
  { key: 'unstressed', label: 'unstressed, !', text: 'V!', lengthScale: 1 },
  { key: 'quick', label: 'stressed, !, quicker (0.8×)', text: 'ˈV!', lengthScale: 0.8 },
  { key: 'slow', label: 'stressed, !, slower (1.4×)', text: 'ˈV!', lengthScale: 1.4 },
  { key: 'slower', label: 'stressed, !, much slower (1.8×)', text: 'ˈV!', lengthScale: 1.8 },
  { key: 'slow-stop', label: 'stressed, full stop, slower (1.4×)', text: 'ˈV.', lengthScale: 1.4 },
  { key: 'glottal-onset', label: 'glottal stop before', text: 'ʔˈV!', lengthScale: 1 },
  { key: 'glottal-both', label: 'glottal stops either side', text: 'ʔˈVʔ!', lengthScale: 1 },
  { key: 'schwa-before', label: 'schwa before', text: 'əˈV!', lengthScale: 1 },
  { key: 'repeated', label: 'said twice', text: 'ˈV ˈV!', lengthScale: 1 },
  { key: 'h-onset', label: 'h before', text: 'hˈV!', lengthScale: 1, withConsonants: true },
  {
    key: 'hvd',
    label: 'h_d (hid, head, hard…)',
    text: 'hˈVd!',
    lengthScale: 1,
    withConsonants: true,
  },
  { key: 'hvd-stop', label: 'h_d, full stop', text: 'hˈVd.', lengthScale: 1, withConsonants: true },
  {
    key: 'bvt',
    label: 'b_t (bit, bet, bat…)',
    text: 'bˈVt!',
    lengthScale: 1,
    withConsonants: true,
  },
  {
    key: 'pvt-question',
    label: 'p_t, question mark',
    text: 'pˈVt?',
    lengthScale: 1,
    withConsonants: true,
  },
  { key: 'svs', label: 's_s', text: 'sˈVs!', lengthScale: 1, withConsonants: true },
];

/**
 * The renderings offered for every consonant (affricates, clicks, implosives
 * and the other symbols too). Every RP consonant clip uses the schwa frame
 * (`əVˈə!`), so it is offered twice; a lone consonant often barely sounds.
 */
export const CONSONANT_VARIANTS: readonly Variant[] = [
  {
    key: 'schwa-both-1',
    label: 'schwas either side (RP recipe), take 1',
    text: 'əVˈə!',
    lengthScale: 1,
  },
  {
    key: 'schwa-both-2',
    label: 'schwas either side (RP recipe), take 2',
    text: 'əVˈə!',
    lengthScale: 1,
  },
  {
    key: 'schwa-both-slow',
    label: 'schwas either side, slower (1.4×)',
    text: 'əVˈə!',
    lengthScale: 1.4,
  },
  { key: 'schwa-both-comma', label: 'schwas either side, comma', text: 'əVˈə,', lengthScale: 1 },
  {
    key: 'schwa-both-question',
    label: 'schwas either side, question mark',
    text: 'əVˈə?',
    lengthScale: 1,
  },
  { key: 'isolated', label: 'alone, !', text: 'V!', lengthScale: 1 },
  { key: 'stressed', label: 'alone, stressed, !', text: 'ˈV!', lengthScale: 1 },
  { key: 'schwa-after', label: 'schwa after', text: 'Vˈə!', lengthScale: 1 },
  { key: 'schwa-before', label: 'schwa before', text: 'ˈəV!', lengthScale: 1 },
  { key: 'a-both', label: 'a either side', text: 'ˈaVa!', lengthScale: 1 },
  { key: 'i-both', label: 'i either side', text: 'ˈiVi!', lengthScale: 1 },
  { key: 'u-both', label: 'u either side', text: 'ˈuVu!', lengthScale: 1 },
];

const isVowelLike = (s: PhoneSymbol) => s.category === 'vowel' || s.category === 'diphthong';

/** The renderings offered for a symbol: vowel or consonant framings. */
export const variantsFor = (symbol: PhoneSymbol): readonly Variant[] =>
  isVowelLike(symbol) ? VARIANTS : CONSONANT_VARIANTS;

/** The sets of sounds that can be picked a set at a time. */
export const SETS = ['vowels', 'extended'] as const;
export type SetName = (typeof SETS)[number];

/** The RP vowels and diphthongs, in palette order. */
export const vowelSymbols = (): readonly PhoneSymbol[] => soundingSymbols().filter(isVowelLike);

/** The sounds only the full IPA has (#14), in palette order. */
export const extendedSymbols = (): readonly PhoneSymbol[] => {
  const rp = new Set<string>(symbolsIn('rp').map((s) => s.id));
  return symbolsIn('extended').filter((s) => isSounding(s) && !rp.has(s.id));
};

/** The symbols in a set. */
export const symbolsOf = (set: SetName): readonly PhoneSymbol[] =>
  set === 'vowels' ? vowelSymbols() : extendedSymbols();

/** One rendering of one sound. */
export interface Candidate extends Variant {
  readonly id: string;
  /** The text with the sound filled in. */
  readonly text: string;
}

/** Every rendering of every sound. */
export const candidatesFor = (symbols: readonly PhoneSymbol[]): Candidate[] =>
  symbols.flatMap((symbol) =>
    variantsFor(symbol).map((variant) => ({
      ...variant,
      id: symbol.id,
      text: variant.text.replaceAll('V', symbol.ipa),
    })),
  );

/**
 * What the maintainer chose for one sound: a variant key, `current` to keep the
 * app's clip, or `none` when the voice can't produce the sound (no clip, #14).
 */
export interface Pick {
  readonly pick: string | undefined;
  readonly comment: string;
}

/**
 * Reads a picks file (`{ "<id>": { "pick": "<key>" | "current" | "none", "comment": "…" } }`)
 * against a set. A sound may have only a comment; an unknown sound or key is an
 * error, not a silent skip.
 */
export const parsePicks = (
  json: unknown,
  symbols: readonly PhoneSymbol[],
):
  | { readonly ok: true; readonly picks: ReadonlyMap<string, Pick> }
  | { readonly ok: false; readonly problems: string[] } => {
  if (typeof json !== 'object' || json === null || Array.isArray(json)) {
    return {
      ok: false,
      problems: ['picks must be a JSON object of symbol id → { pick, comment }'],
    };
  }
  const problems: string[] = [];
  const picks = new Map<string, Pick>();
  for (const id of Object.keys(json)) {
    const value: unknown = Reflect.get(json, id);
    const symbol = symbols.find((s) => s.id === id);
    if (symbol === undefined) {
      problems.push(`${id}: not in this set`);
      continue;
    }
    const keys = new Set(['current', 'none', ...variantsFor(symbol).map((v) => v.key)]);
    const fields: ReadonlyMap<string, unknown> =
      typeof value === 'object' && value !== null
        ? new Map(Object.keys(value).map((key) => [key, Reflect.get(value, key)]))
        : new Map();
    const pick = fields.get('pick');
    const comment = fields.get('comment') ?? '';
    if (pick !== undefined && (typeof pick !== 'string' || !keys.has(pick))) {
      problems.push(`${id}: ${JSON.stringify(pick)} is not one of its renderings`);
    } else if (typeof comment !== 'string') {
      problems.push(`${id}: comment must be text`);
    } else {
      picks.set(id, { pick, comment });
    }
  }
  return problems.length > 0 ? { ok: false, problems } : { ok: true, picks };
};

/** A render as recorded in `renders.json`. */
interface RenderRecord {
  readonly id: string;
  readonly key: string;
  readonly text: string;
  readonly lengthScale: number;
  readonly file: string;
}

const isRenderRecord = (value: unknown): value is RenderRecord =>
  typeof value === 'object' &&
  value !== null &&
  typeof Reflect.get(value, 'id') === 'string' &&
  typeof Reflect.get(value, 'key') === 'string' &&
  typeof Reflect.get(value, 'text') === 'string' &&
  typeof Reflect.get(value, 'lengthScale') === 'number' &&
  typeof Reflect.get(value, 'file') === 'string';

/** Reads renders.json's renders; anything malformed is an error, not a silent skip. */
export const parseRenders = (json: unknown): RenderRecord[] => {
  const rendered: unknown =
    typeof json === 'object' && json !== null ? Reflect.get(json, 'rendered') : undefined;
  if (!Array.isArray(rendered) || !rendered.every(isRenderRecord)) {
    throw new Error('renders.json is malformed; re-render the set');
  }
  return rendered;
};

/**
 * The renders the picks choose, one per sound that picked a new rendering.
 * `current`, `none`, or no pick, adds nothing. A pick with no render (say,
 * after `--only` re-rendered other sounds) is an error.
 */
export const chosenRenders = (
  picks: ReadonlyMap<string, Pick>,
  rendered: readonly RenderRecord[],
): RenderRecord[] =>
  [...picks].flatMap(([id, { pick }]) => {
    if (pick === undefined || pick === 'current' || pick === 'none') return [];
    const render = rendered.find((r) => r.id === id && r.key === pick);
    if (render === undefined)
      throw new Error(`${id}/${pick}: no render; re-render it with --only ${id}`);
    return [render];
  });

/** The sounds picked `none`: the voice can't produce them (#14, ADR-0012). */
export const unproducible = (picks: ReadonlyMap<string, Pick>): string[] =>
  [...picks].flatMap(([id, { pick }]) => (pick === 'none' ? [id] : []));

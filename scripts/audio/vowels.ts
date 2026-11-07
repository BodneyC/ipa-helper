// Pure logic for re-picking the vowel clips: the ways Cori is asked to say
// each vowel, and the maintainer's picks and comments. No I/O here.
import { soundingSymbols } from './clips';
import type { PhoneSymbol } from '../../src/domain/inventory/types';

/** One way of asking the voice for a vowel. `V` in `text` stands for the vowel. */
interface Variant {
  readonly key: string;
  readonly label: string;
  /** What the voice is given, with the vowel as `V`. Stress goes before the vowel (ADR-0009). */
  readonly text: string;
  /** Piper's length_scale: 1 is the voice's own pace, higher is slower. */
  readonly lengthScale: number;
  /** True when the render has sounds besides the vowel, which a clip would keep. */
  readonly withConsonants?: boolean;
}

/**
 * The renderings offered for every vowel. The voice samples noise, so the
 * current recipe (`ˈV!`) is offered three times to compare takes.
 */
export const VARIANTS: readonly Variant[] = [
  { key: 'bang-1', label: 'stressed, ! (current recipe), take 1', text: 'ˈV!', lengthScale: 1 },
  { key: 'bang-2', label: 'stressed, ! (current recipe), take 2', text: 'ˈV!', lengthScale: 1 },
  { key: 'bang-3', label: 'stressed, ! (current recipe), take 3', text: 'ˈV!', lengthScale: 1 },
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

/** The RP vowels and diphthongs, in palette order. */
export const vowelSymbols = (): readonly PhoneSymbol[] =>
  soundingSymbols().filter((s) => s.category === 'vowel' || s.category === 'diphthong');

/** One rendering of one vowel. */
export interface VowelCandidate extends Variant {
  readonly id: string;
  /** The text with the vowel filled in. */
  readonly text: string;
}

/** Every rendering of every vowel. */
export const vowelCandidates = (
  symbols: readonly PhoneSymbol[] = vowelSymbols(),
): VowelCandidate[] =>
  symbols.flatMap((symbol) =>
    VARIANTS.map((variant) => ({
      ...variant,
      id: symbol.id,
      text: variant.text.replaceAll('V', symbol.ipa),
    })),
  );

/** What the maintainer chose for one vowel: a variant key, or `current` to keep the clip. */
export interface VowelPick {
  readonly pick: string | undefined;
  readonly comment: string;
}

/**
 * Reads a picks file (`{ "<id>": { "pick": "<key>" | "current", "comment": "…" } }`)
 * against the vowels. A vowel may have only a comment; an unknown vowel or key is
 * an error, not a silent skip.
 */
export const parseVowelPicks = (
  json: unknown,
  symbols: readonly PhoneSymbol[] = vowelSymbols(),
):
  | { readonly ok: true; readonly picks: ReadonlyMap<string, VowelPick> }
  | { readonly ok: false; readonly problems: string[] } => {
  if (typeof json !== 'object' || json === null || Array.isArray(json)) {
    return { ok: false, problems: ['picks must be a JSON object of vowel id → { pick, comment }'] };
  }
  const keys = new Set(['current', ...VARIANTS.map((v) => v.key)]);
  const ids = new Set<string>(symbols.map((s) => s.id));
  const problems: string[] = [];
  const picks = new Map<string, VowelPick>();
  for (const id of Object.keys(json)) {
    const value: unknown = Reflect.get(json, id);
    if (!ids.has(id)) {
      problems.push(`${id}: not an RP vowel`);
      continue;
    }
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

/** A render as recorded in `.cache/vowel-clips/vowels.json`. */
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

/** Reads vowels.json's renders; anything malformed is an error, not a silent skip. */
export const parseVowelRenders = (json: unknown): RenderRecord[] => {
  const rendered: unknown =
    typeof json === 'object' && json !== null ? Reflect.get(json, 'rendered') : undefined;
  if (!Array.isArray(rendered) || !rendered.every(isRenderRecord)) {
    throw new Error('vowels.json is malformed; re-run pnpm audio:vowels');
  }
  return rendered;
};

/**
 * The renders the picks choose, one per vowel that picked a new rendering.
 * `current`, or no pick, keeps the app's clip. A pick with no render (say,
 * after `--only` re-rendered other vowels) is an error.
 */
export const chosenRenders = (
  picks: ReadonlyMap<string, VowelPick>,
  rendered: readonly RenderRecord[],
): RenderRecord[] =>
  [...picks].flatMap(([id, { pick }]) => {
    if (pick === undefined || pick === 'current') return [];
    const render = rendered.find((r) => r.id === id && r.key === pick);
    if (render === undefined) {
      throw new Error(`${id}/${pick}: no render; re-run pnpm audio:vowels --only ${id}`);
    }
    return [render];
  });

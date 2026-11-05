// Pure logic for the symbol clip generator (M4.3, ADR-0009): which texts to
// render, how Piper encodes them, and the picks → manifest step. No I/O here.
import { isSounding, symbolsIn } from '../../src/domain/inventory/index';
import type { PhoneSymbol } from '../../src/domain/inventory/types';

/**
 * How a symbol is framed for the voice. A lone plosive barely sounds, so
 * consonants are also offered with a schwa around them; vowels are offered
 * stressed, stressed and slowed, and bare. The maintainer picks one per symbol
 * by ear (M4.3).
 */
const FRAMES = [
  'isolated',
  'stressed',
  'stressed-slow',
  'schwa-after',
  'schwa-before',
  'schwa-both',
] as const;
export type Frame = (typeof FRAMES)[number];

const isFrame = (value: unknown): value is Frame => FRAMES.some((frame) => frame === value);

/** One rendering of one symbol. */
export interface Candidate {
  readonly id: string;
  readonly frame: Frame;
  /** What the voice is given (see `frameText`). */
  readonly text: string;
  /** Piper's length_scale: 1 is the voice's own pace, higher is slower. */
  readonly lengthScale: number;
}

/** The RP symbols that make a sound: everything except the suprasegmental marks. */
export const soundingSymbols = (): readonly PhoneSymbol[] => symbolsIn('rp').filter(isSounding);

const framesFor = (symbol: PhoneSymbol): readonly Frame[] =>
  symbol.category === 'vowel' || symbol.category === 'diphthong'
    ? ['stressed', 'stressed-slow', 'isolated']
    : ['isolated', 'schwa-after', 'schwa-before', 'schwa-both'];

/** How much `stressed-slow` stretches a vowel: short vowels alone last under 0.3 s. */
export const SLOW_LENGTH_SCALE = 1.8;

/**
 * The text a frame gives the voice. Stress goes just before the vowel, as Piper
 * was trained (ADR-0009). Every text ends in `!`, not `.`: for a single sound a
 * final `.` makes the voice's duration predictor run on for 2–5 s, even with
 * its duration noise off, while `!` gives stable, natural lengths (M4.3 finding).
 */
export const frameText = (ipa: string, frame: Frame): string => {
  switch (frame) {
    case 'isolated':
      return `${ipa}!`;
    case 'stressed':
    case 'stressed-slow':
      return `ˈ${ipa}!`;
    case 'schwa-after':
      return `${ipa}ə!`;
    case 'schwa-before':
      return `ə${ipa}!`;
    case 'schwa-both':
      return `ə${ipa}ˈə!`;
  }
};

/** Every candidate rendering for every sounding RP symbol. */
export const candidates = (symbols: readonly PhoneSymbol[] = soundingSymbols()): Candidate[] =>
  symbols.flatMap((symbol) =>
    framesFor(symbol).map((frame) => ({
      id: symbol.id,
      frame,
      text: frameText(symbol.ipa, frame),
      lengthScale: frame === 'stressed-slow' ? SLOW_LENGTH_SCALE : 1,
    })),
  );

/** A Piper voice's `phoneme_id_map`: one codepoint → its IDs. */
export type PhonemeIdMap = Readonly<Record<string, readonly number[] | undefined>>;

/**
 * Piper's input encoding (ADR-0009): BOS `^` and PAD `_`, then each codepoint
 * followed by PAD, then EOS `$`. Returns the codepoints the voice lacks instead
 * when there are any.
 */
export const phonemeIds = (
  text: string,
  map: PhonemeIdMap,
):
  | { readonly ok: true; readonly ids: number[] }
  | { readonly ok: false; readonly missing: string[] } => {
  const id = (symbol: string) => map[symbol];
  const [bos, pad, eos] = [id('^'), id('_'), id('$')];
  if (bos === undefined || pad === undefined || eos === undefined) {
    return { ok: false, missing: ['^', '_', '$'].filter((s) => id(s) === undefined) };
  }
  const ids = [...bos, ...pad];
  const missing: string[] = [];
  for (const symbol of text) {
    const found = id(symbol);
    if (found === undefined) missing.push(symbol);
    else ids.push(...found, ...pad);
  }
  ids.push(...eos);
  return missing.length > 0 ? { ok: false, missing } : { ok: true, ids };
};

/** One committed clip, as recorded in the manifest. */
export interface ClipEntry {
  readonly frame: Frame;
  readonly text: string;
  readonly lengthScale: number;
  readonly sha256: string;
}

/**
 * Checks a picks file (`{ "<symbol id>": "<frame>" }`) against the candidates:
 * every sounding symbol needs exactly one pick, and the pick must be one of its
 * candidates. Returns the chosen candidates, or every problem found.
 */
export const resolvePicks = (
  picks: unknown,
  all: readonly Candidate[] = candidates(),
):
  | { readonly ok: true; readonly chosen: Candidate[] }
  | { readonly ok: false; readonly problems: string[] } => {
  if (typeof picks !== 'object' || picks === null || Array.isArray(picks)) {
    return { ok: false, problems: ['picks must be a JSON object of symbol id → frame'] };
  }
  const entries = new Map<string, unknown>(Object.entries(picks));
  const ids = [...new Set(all.map((c) => c.id))];
  const problems: string[] = [];
  const chosen: Candidate[] = [];
  for (const id of ids) {
    const frame = entries.get(id);
    const match = all.find((c) => c.id === id && c.frame === frame);
    if (frame === undefined) problems.push(`${id}: no pick`);
    else if (!isFrame(frame) || match === undefined)
      problems.push(`${id}: ${JSON.stringify(frame)} is not one of its frames`);
    else chosen.push(match);
  }
  for (const id of entries.keys()) {
    if (!ids.includes(id)) problems.push(`${id}: not a sounding RP symbol`);
  }
  return problems.length > 0 ? { ok: false, problems } : { ok: true, chosen };
};

/** A rendered candidate, as recorded in `.cache/symbol-clips/candidates.json`. */
export interface Rendered extends Candidate {
  /** Path relative to the candidates directory. */
  readonly file: string;
  readonly seconds: number;
  readonly sha256: string;
}

const isRendered = (value: unknown): value is Rendered => {
  if (typeof value !== 'object' || value === null) return false;
  const fields = new Map(Object.entries(value));
  return (
    typeof fields.get('id') === 'string' &&
    isFrame(fields.get('frame')) &&
    typeof fields.get('text') === 'string' &&
    typeof fields.get('lengthScale') === 'number' &&
    typeof fields.get('file') === 'string' &&
    typeof fields.get('seconds') === 'number' &&
    typeof fields.get('sha256') === 'string'
  );
};

/** Reads candidates.json; anything malformed is an error, not a silent skip. */
export const parseRendered = (json: unknown): Rendered[] => {
  if (!Array.isArray(json) || !json.every(isRendered)) {
    throw new Error('candidates.json is malformed; re-run pnpm audio:candidates');
  }
  return json;
};

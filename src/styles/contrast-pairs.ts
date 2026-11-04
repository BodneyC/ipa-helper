/**
 * Every foreground/background token pairing the UI uses, with its WCAG minimum
 * (NFR-2). The unit test checks each pair in every theme × contrast. Add a pair
 * here before you use a new combination in a stylesheet.
 *
 * - 4.5: body text.
 * - 3: large text (≥ 24 px, or ≥ 18.66 px bold) and non-text UI such as focus
 *   rings, key borders and group accent bars (WCAG 1.4.11).
 */
export interface ContrastPair {
  readonly fg: string;
  readonly bg: readonly string[];
  readonly min: 4.5 | 3;
  readonly use: string;
}

const pageAndCard = ['--color-bg', '--color-surface'] as const;
const allSurfaces = [...pageAndCard, '--color-surface-raised'] as const;
const accents = [
  '--color-accent-consonant',
  '--color-accent-affricate',
  '--color-accent-vowel',
  '--color-accent-diphthong',
  '--color-accent-supra',
  '--color-accent-diacritic',
] as const;

export const CONTRAST_PAIRS: readonly ContrastPair[] = [
  { fg: '--color-text', bg: allSurfaces, min: 4.5, use: 'body text, glyphs, hovered keys' },
  { fg: '--color-text-muted', bg: pageAndCard, min: 4.5, use: 'labels, key micro-labels' },
  { fg: '--color-text-subtle', bg: pageAndCard, min: 3, use: 'large slashes in the word display' },
  { fg: '--color-focus', bg: allSurfaces, min: 3, use: 'focus ring, word cursor' },
  { fg: '--color-danger', bg: pageAndCard, min: 3, use: 'error borders and icons' },
  ...accents.map(
    // Key focus rings use outline-offset, so they sit on the card, never on the key's raised fill.
    (fg): ContrastPair => ({
      fg,
      bg: pageAndCard,
      min: 3,
      use: 'group bar, offset key focus ring',
    }),
  ),
];

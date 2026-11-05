import type { Category } from '../../../domain/inventory/types';
import type { Accent } from '../../components/accent';

/** How a group lays out its keys (ARCHITECTURE §6). */
type GroupLayout = 'chart' | 'vowels' | 'grid';

/** A palette group (FR-1). */
export interface Group {
  readonly category: Category;
  readonly title: string;
  readonly accent: Accent;
  readonly layout: GroupLayout;
}

/** The palette groups, in display order (FR-1), with their accents (SPEC §6). */
export const GROUPS: readonly Group[] = [
  { category: 'consonant', title: 'Consonants', accent: 'consonant', layout: 'chart' },
  { category: 'affricate', title: 'Affricates', accent: 'affricate', layout: 'grid' },
  // Full IPA only. Consonants too, so they share the consonant accent (SPEC §6).
  {
    category: 'non-pulmonic',
    title: 'Non-pulmonic consonants',
    accent: 'consonant',
    layout: 'grid',
  },
  { category: 'vowel', title: 'Vowels', accent: 'vowel', layout: 'vowels' },
  { category: 'diphthong', title: 'Diphthongs', accent: 'diphthong', layout: 'grid' },
  { category: 'suprasegmental', title: 'Suprasegmentals', accent: 'supra', layout: 'grid' },
  { category: 'diacritic', title: 'Diacritics', accent: 'diacritic', layout: 'grid' },
];

/** "lateral-approximant" → "Lateral approximant". */
export const headerLabel = (feature: string): string => {
  const words = feature.replaceAll('-', ' ');
  return words.charAt(0).toUpperCase() + words.slice(1);
};

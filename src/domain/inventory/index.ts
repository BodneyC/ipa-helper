/**
 * The symbol registry. This is the only barrel file in src/ (ARCHITECTURE §11):
 * everything outside the inventory looks symbols up through it.
 */
import { AFFRICATES, CONSONANTS } from './consonants';
import { DIPHTHONGS } from './diphthongs';
import { SUPRASEGMENTALS } from './suprasegmentals';
import type { SymbolId } from './symbol-id';
import type { InventoryId, PhoneSymbol } from './types';
import { VOWELS } from './vowels';

/** Every known symbol, in palette group order (FR-1). */
export const SYMBOLS: readonly PhoneSymbol[] = [
  ...CONSONANTS,
  ...AFFRICATES,
  ...VOWELS,
  ...DIPHTHONGS,
  ...SUPRASEGMENTALS,
];

const byId: ReadonlyMap<SymbolId, PhoneSymbol> = new Map(SYMBOLS.map((s) => [s.id, s]));

/** Looks a symbol up by ID. Returns `undefined` for an ID no inventory defines. */
export const symbolById = (id: SymbolId): PhoneSymbol | undefined => byId.get(id);

/** The symbols in one inventory, in palette group order (FR-3). */
export const symbolsIn = (inventory: InventoryId): readonly PhoneSymbol[] =>
  SYMBOLS.filter((s) => s.inventories.includes(inventory));

/**
 * True when a symbol makes a sound of its own and so can be played (FR-30).
 * Suprasegmentals and diacritics (M6) only modify other sounds, so they have
 * no clip and don't count towards a word's length (ADR-0009).
 */
export const isSounding = (symbol: PhoneSymbol): boolean =>
  symbol.category !== 'suprasegmental' && symbol.category !== 'diacritic';

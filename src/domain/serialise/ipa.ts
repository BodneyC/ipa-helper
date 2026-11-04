import { symbolById } from '../inventory';
import { rendering, resolve, withSlashes } from './serialiser';
import type { DisplayOptions, Serialiser, SymbolLookup } from './serialiser';

/**
 * FR-11, FR-20: the IPA transcription, e.g. `/ˈθɔːnɪk/`. Each token's IPA text is
 * concatenated as it is, so a diacritic's combining character (M6) lands after
 * its base.
 */
export const createIpaSerialiser = (
  { slashes, rDisplay }: DisplayOptions,
  lookup: SymbolLookup = symbolById,
): Serialiser => ({
  id: 'ipa',
  serialise: (word) =>
    withSlashes(
      resolve(word, lookup)
        .map((symbol) => rendering(symbol, rDisplay).ipa)
        .join(''),
      slashes,
    ),
});

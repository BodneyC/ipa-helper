import { createResolver, rendering, withSlashes } from './serialiser';
import type { DisplayOptions, Serialiser } from './serialiser';
import type { PhoneSymbol } from '../inventory/types';

/**
 * FR-11, FR-20: the IPA transcription, e.g. `/ˈθɔːnɪk/`. Each token's IPA text is
 * concatenated as it is, so a diacritic's combining character (M6) lands after
 * its base.
 */
export const createIpaSerialiser = (
  { slashes, ...glyphs }: DisplayOptions,
  symbols?: readonly PhoneSymbol[],
): Serialiser => {
  const resolve = createResolver(symbols);
  return {
    id: 'ipa',
    serialise: (word) =>
      withSlashes(
        resolve(word)
          .map((symbol) => rendering(symbol, glyphs).ipa)
          .join(''),
        slashes,
      ),
  };
};

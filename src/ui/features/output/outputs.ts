import { useMemo } from 'react';

import { createIpaSerialiser } from '../../../domain/serialise/ipa';
import { createTipaSerialiser } from '../../../domain/serialise/tipa';
import { useEditor, useSettings } from '../../../state/hooks';

interface Outputs {
  readonly empty: boolean;
  /** The IPA as displayed: always between slashes (FR-11, FR-20). */
  readonly ipaShown: string;
  /** The IPA as copied, with or without slashes (FR-20). */
  readonly ipaCopied: string;
  /** The TIPA string that goes inside the macro (FR-21, Q-2). */
  readonly tipa: string;
  /** The full macro call, e.g. `\ipa{"TO:nIk}` (FR-21). */
  readonly macro: string;
}

/** The current word's output texts, shared by the output panel and the copy shortcuts. */
export const useOutputs = (): Outputs => {
  const { state } = useEditor();
  const { settings } = useSettings();
  const { word } = state;
  return useMemo(() => {
    const { rDisplay } = settings;
    const tipa = createTipaSerialiser({ slashes: settings.tipaSlashes, rDisplay }).serialise(word);
    return {
      empty: word.length === 0,
      ipaShown: createIpaSerialiser({ slashes: true, rDisplay }).serialise(word),
      ipaCopied: createIpaSerialiser({ slashes: settings.ipaSlashes, rDisplay }).serialise(word),
      tipa,
      macro: `\\${settings.macroName}{${tipa}}`,
    };
  }, [word, settings]);
};

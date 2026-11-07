import { createEspeakSerialiser } from './espeak';
import { createIpaSerialiser } from './ipa';
import { createKirshenbaumSerialiser } from './kirshenbaum';
import type { FormatSerialiser } from './notation';
import type { DisplayOptions } from './serialiser';
import { createXsampaSerialiser } from './xsampa';

/** The other output formats (FR-25), in the order the picker lists them. */
export const FORMAT_IDS = ['xsampa', 'kirshenbaum', 'espeak', 'html'] as const;
/** One of the other output formats. */
export type FormatId = (typeof FORMAT_IDS)[number];

/** Each format's name, as the picker and copy button show it. */
export const FORMAT_NAMES: Readonly<Record<FormatId, string>> = {
  xsampa: 'X-SAMPA',
  kirshenbaum: 'Kirshenbaum',
  espeak: 'eSpeak',
  html: 'HTML',
};

/** Escapes text for HTML content or a quoted attribute (`&` first, so nothing is escaped twice). */
export const escapeHtml = (text: string): string =>
  text
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');

/**
 * FR-29: the IPA as an HTML snippet that also works in Markdown, tagged as an
 * IPA transcription (`und-fonipa`, BCP 47) so browsers and screen readers can
 * treat it as such: `<span lang="und-fonipa">/ˈflɒɡɪʃ/</span>`.
 */
const createHtmlSerialiser = (options: DisplayOptions): FormatSerialiser => {
  const ipa = createIpaSerialiser(options);
  return {
    serialise: (word) => ({
      text: `<span lang="und-fonipa">${escapeHtml(ipa.serialise(word))}</span>`,
      unsupported: [],
    }),
  };
};

/**
 * The serialiser for a format (FR-25). The HTML snippet follows the display
 * options (slashes, British r, tie bars) like the IPA row; the ASCII
 * notations write each symbol's own IPA, with tie bars where X-SAMPA has them.
 */
export const formatSerialiser = (id: FormatId, options: DisplayOptions): FormatSerialiser => {
  switch (id) {
    case 'xsampa':
      return createXsampaSerialiser(options);
    case 'kirshenbaum':
      return createKirshenbaumSerialiser();
    case 'espeak':
      return createEspeakSerialiser();
    case 'html':
      return createHtmlSerialiser(options);
  }
};

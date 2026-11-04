import type { Example } from './types';

/** Exactly one `**…**` span, with unmarked text either side. */
const MARKED = /^([^*]*)\*\*([^*]+)\*\*([^*]*)$/;

/**
 * Builds an {@link Example} from the notation SPEC §7 uses: `"**sh**ip"`
 * highlights "sh" in "ship". The data then reads like the spec tables, and
 * nobody has to count offsets by hand.
 *
 * It is for static inventory data, so malformed input is a programming error and
 * throws when the module loads.
 */
export const example = (marked: string): Example => {
  const match = MARKED.exec(marked);
  if (match === null) {
    throw new Error(`Example must contain exactly one **…** span: ${JSON.stringify(marked)}`);
  }
  const [, before = '', highlighted = '', after = ''] = match;
  const start = before.length;
  const end = start + highlighted.length;
  return { word: before + highlighted + after, highlight: [start, end] };
};

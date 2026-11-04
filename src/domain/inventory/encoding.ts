import type { TipaEncoding } from './types';

/** A TIPA encoding written as plain input characters, e.g. `lit('S')` for ʃ. */
export const lit = (text: string): TipaEncoding => ({ kind: 'literal', text });

/** A TIPA encoding written as a control word, e.g. `macro('ae')` for æ (`\ae{}`). */
export const macro = (name: string): TipaEncoding => ({ kind: 'macro', name });

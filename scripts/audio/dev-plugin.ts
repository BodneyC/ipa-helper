// Warns, when the dev server starts, if the voice model is missing. The model
// is gitignored and only `pnpm voice:fetch` puts it in public/voice/ (ADR-0009);
// without it Play word fails with a misleading "check your connection".
import { existsSync } from 'node:fs';
import { join } from 'node:path';

import type { Plugin } from 'vite';

import { VOICE } from '../../src/adapters/audio/voice';

/** The warning to print, or `undefined` when the model is in `publicDir`. */
export const missingVoiceWarning = (publicDir: string): string | undefined =>
  existsSync(join(publicDir, 'voice', VOICE.model.servedAs))
    ? undefined
    : `Play word needs the voice model, which isn't in ${join(publicDir, 'voice')}. Run: pnpm voice:fetch`;

/** Dev only: prints {@link missingVoiceWarning} when the server starts. */
export const voiceModelPlugin = (): Plugin => ({
  name: 'ipa-helper:voice-model',
  apply: 'serve',
  configureServer(server) {
    const warning = missingVoiceWarning(server.config.publicDir);
    if (warning !== undefined) server.config.logger.warn(warning);
  },
});

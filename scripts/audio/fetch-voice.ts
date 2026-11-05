// Puts the pinned, SHA-256-checked voice model where the app serves it (M5.2, ADR-0009).
// Usage: pnpm voice:fetch   (the deploy runs it before `pnpm build`)
// Output: public/voice/<VOICE.model.servedAs>, which is gitignored (63.5 MB).
import { copyFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

import { fetchVerified, ROOT, VOICE } from './voice';

const source = await fetchVerified(VOICE.model);
const dir = join(ROOT, 'public', 'voice');
mkdirSync(dir, { recursive: true });
copyFileSync(source, join(dir, VOICE.model.servedAs));
console.log(`Voice model ready: public/voice/${VOICE.model.servedAs}`);

// Writes the TIPA compile fixture for the CI TeX job (M6.4).
// Usage: pnpm tex:generate   (then pnpm tex:check compiles it with pdflatex)
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { symbolsTex } from './symbols-tex';

const OUT = join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'tests', 'tex', 'out');
mkdirSync(OUT, { recursive: true });
writeFileSync(join(OUT, 'symbols.tex'), symbolsTex());
console.log(`Wrote ${join(OUT, 'symbols.tex')}`);

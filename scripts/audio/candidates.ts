// Renders every candidate symbol clip and a page to listen to them (M4.3).
// Usage: pnpm audio:candidates [--only id,id,…]
// Output: .cache/symbol-clips/ (listen.html, candidates.json, <id>/<frame>.opus)
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { parseArgs } from 'node:util';

import { candidates, parseRendered, soundingSymbols } from './clips';
import type { Rendered } from './clips';
import { listeningPage } from './listen-page';
import { CACHE, encodeOpus, loadVoice, sha256 } from './voice';

const OUT = join(CACHE, 'symbol-clips');
const INDEX = join(OUT, 'candidates.json');

const { values } = parseArgs({ options: { only: { type: 'string' } } });
const only = values.only === undefined ? undefined : new Set(values.only.split(','));
const todo = candidates().filter((c) => only === undefined || only.has(c.id));
if (only !== undefined) {
  const known = new Set(todo.map((c) => c.id));
  const unknown = [...only].filter((id) => !known.has(id));
  if (unknown.length > 0) throw new Error(`--only: not sounding RP symbols: ${unknown.join(', ')}`);
}

// Re-rendering some symbols keeps everyone else's renders.
const previous = existsSync(INDEX) ? parseRendered(JSON.parse(readFileSync(INDEX, 'utf8'))) : [];
const kept = previous.filter((r) => !todo.some((c) => c.id === r.id));

const voice = await loadVoice();
const rendered: Rendered[] = [];
for (const candidate of todo) {
  const [noise, , noiseW] = voice.scales;
  const samples = await voice.synthesise(candidate.text, [noise, candidate.lengthScale, noiseW]);
  const opus = await encodeOpus(samples, voice.sampleRate);
  const file = join(candidate.id, `${candidate.frame}.opus`);
  mkdirSync(join(OUT, candidate.id), { recursive: true });
  writeFileSync(join(OUT, file), opus);
  const seconds = samples.length / voice.sampleRate;
  rendered.push({ ...candidate, file, seconds, sha256: sha256(opus) });
  console.log(
    `${candidate.id.padEnd(18)} ${candidate.frame.padEnd(13)} ${candidate.text.padEnd(8)} ${seconds.toFixed(2)} s`,
  );
}

const order = candidates();
const all = [...kept, ...rendered].sort(
  (a, b) =>
    order.findIndex((c) => c.id === a.id && c.frame === a.frame) -
    order.findIndex((c) => c.id === b.id && c.frame === b.frame),
);
writeFileSync(INDEX, `${JSON.stringify(all, null, 2)}\n`);
writeFileSync(join(OUT, 'listen.html'), listeningPage(soundingSymbols(), all));
console.log(
  `\n${String(rendered.length)} clips rendered. Listen and pick: ${join(OUT, 'listen.html')}`,
);

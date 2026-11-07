// Renders many ways of saying each RP vowel and diphthong, beside the clip the
// app plays now, and a page to compare them and pick.
// Usage: pnpm audio:vowels [--only id,id,…]
// Output: .cache/vowel-clips/ (listen.html, vowels.json, current/<id>.opus, <id>/<key>.opus)
import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { parseArgs } from 'node:util';

import { CACHE, encodeOpus, loadVoice, ROOT } from './voice';
import { vowelPage } from './vowel-page';
import type { CurrentClip, RenderedVowel } from './vowel-page';
import { vowelCandidates, vowelSymbols } from './vowels';

const OUT = join(CACHE, 'vowel-clips');
const CLIPS = join(ROOT, 'src', 'assets', 'audio', 'symbols');

const { values } = parseArgs({ options: { only: { type: 'string' } } });
const only = values.only === undefined ? undefined : new Set(values.only.split(','));
const symbols = vowelSymbols().filter((s) => only === undefined || only.has(s.id));
if (only !== undefined && symbols.length !== only.size) {
  const known = new Set<string>(symbols.map((s) => s.id));
  throw new Error(`--only: not RP vowels: ${[...only].filter((id) => !known.has(id)).join(', ')}`);
}

// The app's clips, copied beside the page so it plays them from the same folder.
const manifest: unknown = JSON.parse(readFileSync(join(CLIPS, 'manifest.json'), 'utf8'));
const clips: unknown =
  typeof manifest === 'object' && manifest !== null ? Reflect.get(manifest, 'clips') : undefined;
const recipeText = (id: string): string => {
  const recipe: unknown =
    typeof clips === 'object' && clips !== null ? Reflect.get(clips, id) : undefined;
  const text: unknown =
    typeof recipe === 'object' && recipe !== null ? Reflect.get(recipe, 'text') : undefined;
  return typeof text === 'string' ? text : '?';
};
mkdirSync(join(OUT, 'current'), { recursive: true });
const current: CurrentClip[] = symbols.flatMap((symbol) => {
  const source = join(CLIPS, `${symbol.id}.opus`);
  if (!existsSync(source)) return [];
  const file = join('current', `${symbol.id}.opus`);
  copyFileSync(source, join(OUT, file));
  return [
    { id: symbol.id, file, text: recipeText(symbol.id), seconds: opusSeconds(join(OUT, file)) },
  ];
});

const voice = await loadVoice();
const rendered: RenderedVowel[] = [];
for (const candidate of vowelCandidates(symbols)) {
  const [noise, , noiseW] = voice.scales;
  const samples = await voice.synthesise(candidate.text, [noise, candidate.lengthScale, noiseW]);
  const file = join(candidate.id, `${candidate.key}.opus`);
  mkdirSync(join(OUT, candidate.id), { recursive: true });
  writeFileSync(join(OUT, file), await encodeOpus(samples, voice.sampleRate));
  const seconds = samples.length / voice.sampleRate;
  rendered.push({ ...candidate, file, seconds });
  console.log(
    `${candidate.id.padEnd(18)} ${candidate.key.padEnd(14)} ${candidate.text.padEnd(9)} ${seconds.toFixed(2)} s`,
  );
}

writeFileSync(join(OUT, 'vowels.json'), `${JSON.stringify({ rendered, current }, null, 2)}\n`);
writeFileSync(join(OUT, 'listen.html'), vowelPage(symbols, rendered, current));
console.log(
  `\n${String(rendered.length)} clips rendered. Listen and pick: ${join(OUT, 'listen.html')}`,
);

/** An Ogg Opus file's duration: the last page's granule position, at Opus's fixed 48 kHz. */
function opusSeconds(path: string): number {
  const bytes = readFileSync(path);
  const at = bytes.lastIndexOf('OggS');
  if (at < 0) return Number.NaN;
  const granule = bytes.readBigUInt64LE(at + 6);
  // Opus streams start with pre-skip samples (bytes 10–11 of the OpusHead packet).
  const head = bytes.indexOf('OpusHead');
  const preSkip = head < 0 ? 0 : bytes.readUInt16LE(head + 10);
  return (Number(granule) - preSkip) / 48_000;
}

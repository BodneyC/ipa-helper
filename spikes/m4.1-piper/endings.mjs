// Spike M4.1 follow-up: does terminal punctuation stop Cori trailing off on
// final clusters such as /-ɛlt/? Throwaway. Usage: node spikes/m4.1-piper/endings.mjs
import { createReadStream, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { dirname, extname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';

const here = dirname(fileURLToPath(import.meta.url));
const outDir = join(here, 'out', 'endings');
mkdirSync(outDir, { recursive: true });

const WORDS = ['ˈmaʊzɛlt', 'maʊˈzɛlt', 'ˈbɹɒnɛlt', 'ˈkwɪfɛlt', 'ˈdʒɒmbəlt', 'ˈhɑːvɛld'];
const ENDINGS = { bare: '', period: '.', 'space-period': ' .', comma: ',', excl: '!' };
const RUNS = 3; // synthesis is stochastic (noise_scale, noise_w); repeat each case

const types = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json' };
const server = createServer((req, res) => {
  const path = join(here, decodeURIComponent(new URL(req.url, 'http://x').pathname));
  if (!path.startsWith(here) || !existsSync(path)) { res.writeHead(404).end(); return; }
  res.writeHead(200, { 'content-type': types[extname(path)] ?? 'application/octet-stream' });
  createReadStream(path).pipe(res);
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));

function wav(samples, rate) {
  const n = samples.length;
  const b = Buffer.alloc(44 + n * 2);
  b.write('RIFF', 0); b.writeUInt32LE(36 + n * 2, 4); b.write('WAVEfmt ', 8);
  b.writeUInt32LE(16, 16); b.writeUInt16LE(1, 20); b.writeUInt16LE(1, 22);
  b.writeUInt32LE(rate, 24); b.writeUInt32LE(rate * 2, 28); b.writeUInt16LE(2, 32);
  b.writeUInt16LE(16, 34); b.write('data', 36); b.writeUInt32LE(n * 2, 40);
  for (let i = 0; i < n; i++) b.writeInt16LE(Math.round(Math.max(-1, Math.min(1, samples[i])) * 32767), 44 + i * 2);
  return b;
}

const browser = await chromium.launch();
const page = await browser.newPage();
await page.goto(`http://127.0.0.1:${server.address().port}/index.html?bench`);
await page.waitForFunction(() => 'spike' in window);
await page.evaluate(() => window.spike.load('cori'));

const rows = await page.evaluate(async ([words, endings, runs]) => {
  const { synth, stressToNucleus } = window.spike;
  const out = [];
  for (const w of words) {
    const n = stressToNucleus(w);
    for (const [label, end] of Object.entries(endings)) {
      const secs = [];
      let first;
      for (let i = 0; i < runs; i++) {
        const r = await synth(n + end);
        secs.push(r.samples.length / r.sampleRate);
        first ??= { samples: Array.from(r.samples), rate: r.sampleRate };
      }
      out.push({ w, label, ipa: n + end, secs, ...first });
    }
  }
  return out;
}, [WORDS, ENDINGS, RUNS]);

const header = ['word'.padEnd(12), ...Object.keys(ENDINGS).map((k) => k.padStart(18))].join('');
console.log(`audio length in seconds, min-max of ${RUNS} runs (nucleus stress)\n${header}`);
for (const w of WORDS) {
  const cells = rows.filter((r) => r.w === w).map((r) => {
    writeFileSync(join(outDir, `${w}-${r.label}.wav`), wav(r.samples, r.rate));
    return `${Math.min(...r.secs).toFixed(2)}-${Math.max(...r.secs).toFixed(2)}`.padStart(18);
  });
  console.log(`/${w}/`.padEnd(12) + cells.join(''));
}

await browser.close();
server.close();

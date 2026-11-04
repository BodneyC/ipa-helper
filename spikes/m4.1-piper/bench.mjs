// Spike M4.1 (ADR-0009): benchmark Piper in headless Chromium and write WAVs.
// Throwaway: not part of the app, not linted, not built.
// Usage (from the repo root): node spikes/m4.1-piper/bench.mjs [model-name, default cori] [disabled|basic|extended|all]
import { createReadStream, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { dirname, extname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';

const here = dirname(fileURLToPath(import.meta.url));
const modelName = process.argv[2] ?? 'cori';
const opt = process.argv[3] ?? 'all'; // onnxruntime graphOptimizationLevel
const outDir = join(here, 'out', modelName);
mkdirSync(outDir, { recursive: true });

// Plain static server: no COOP/COEP, matching GitHub Pages (ADR-0010).
const types = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json' };
const server = createServer((req, res) => {
  const path = join(here, decodeURIComponent(new URL(req.url, 'http://x').pathname));
  if (!path.startsWith(here) || !existsSync(path)) { res.writeHead(404).end(); return; }
  res.writeHead(200, { 'content-type': types[extname(path)] ?? 'application/octet-stream' });
  createReadStream(path).pipe(res);
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const url = `http://127.0.0.1:${server.address().port}/index.html?bench`;

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
page.on('console', (m) => console.log('[page]', m.text()));
await page.goto(url);
await page.waitForFunction(() => 'spike' in window);

const load = await page.evaluate(([n, o]) => window.spike.load(n, o), [modelName, opt]);
console.log(`fetch ${load.fetchMs.toFixed(0)} ms, session create ${load.createMs.toFixed(0)} ms`);

const results = await page.evaluate(async () => {
  const { synth, stressToNucleus, WORDS } = window.spike;
  const rows = [];
  for (const [ipa, note] of WORDS) {
    for (const [variant, s] of [['dict', ipa], ['nucleus', stressToNucleus(ipa)]]) {
      const r = await synth(s);
      rows.push({ ipa: s, note, variant, ms: r.ms, missing: r.missing, rate: r.sampleRate, samples: Array.from(r.samples) });
    }
  }
  return rows;
});
const first = results[0].ms;
const warm = results.slice(1).map((r) => r.ms).sort((a, b) => a - b);
const median = warm[Math.floor(warm.length / 2)];
const p95 = warm[Math.floor(warm.length * 0.95)];

results.forEach((r, i) => {
  const name = `${String(Math.floor(i / 2) + 1).padStart(2, '0')}-${r.variant}.wav`;
  writeFileSync(join(outDir, name), wav(r.samples, r.rate));
  const secs = (r.samples.length / r.rate).toFixed(2);
  console.log(`${name.padEnd(16)} /${r.ipa}/`.padEnd(36), `${r.ms.toFixed(0).padStart(4)} ms  ${secs} s audio`, r.missing.length ? `MISSING ${r.missing.join('')}` : '');
});
console.log(`\ncold start (session create + first word): ${(load.createMs + first).toFixed(0)} ms`);
console.log(`warm synthesis: median ${median.toFixed(0)} ms, p95 ${p95.toFixed(0)} ms, max ${warm.at(-1).toFixed(0)} ms`);

await browser.close();
server.close();

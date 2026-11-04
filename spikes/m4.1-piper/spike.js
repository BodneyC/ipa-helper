// Spike M4.1 (ADR-0009). Throwaway: not part of the app, not linted, not built.
/* global ort */

export const WORDS = [
  ['ˈflɒɡɪʃ', 'README example'],
  ['ˈθɔːnɪk', 'M2.9 e2e word'],
  ['ˈtʃæmbɹɪk', 'stress pair A, initial'],
  ['tʃæmˈbɹɪk', 'stress pair A, final'],
  ['ˈsɛlvədɔː', 'stress pair B, initial'],
  ['ˌsɛlvəˈdɔː', 'stress pair B, secondary + final'],
  ['ˈmaʊzɛlt', 'stress pair C, initial'],
  ['maʊˈzɛlt', 'stress pair C, final'],
  ['ˈkɪpə', 'length/quality pair, short'],
  ['ˈkiːpə', 'length/quality pair, long'],
  ['ʒeəˈlaɪmɒθ', 'diphthongs, /ʒ/'],
  ['ˈdʒʊənəʊ', 'centring diphthong, /dʒ/'],
];

const VOWELS = new Set('iyɨʉɯuɪʏʊeøɘɵɤoəɛœɜɞʌɔæɐaɶɑɒ');
const STRESS = new Set(['ˈ', 'ˌ']);

/** Move each stress mark rightwards past consonants to just before the next vowel. */
export function stressToNucleus(ipa) {
  const out = [];
  let pending = '';
  for (const ch of ipa) {
    if (STRESS.has(ch)) pending += ch;
    else if (pending && VOWELS.has(ch)) { out.push(pending, ch); pending = ''; }
    else out.push(ch);
  }
  return out.join('') + pending;
}

let session;
let idMap;
let cfg;

export async function load(name = 'cori', opt = 'all', base = './model/') {
  const t0 = performance.now();
  ort.env.wasm.wasmPaths = 'https://cdn.jsdelivr.net/npm/onnxruntime-web@1.20.1/dist/';
  ort.env.wasm.numThreads = 1; // GitHub Pages cannot send COOP/COEP (ADR-0010).
  cfg = await (await fetch(base + name + '.onnx.json')).json();
  idMap = cfg.phoneme_id_map;
  const bytes = new Uint8Array(await (await fetch(base + name + '.onnx')).arrayBuffer());
  const tFetched = performance.now();
  session = await ort.InferenceSession.create(bytes, { executionProviders: ['wasm'], graphOptimizationLevel: opt });
  const tReady = performance.now();
  return { fetchMs: tFetched - t0, createMs: tReady - tFetched };
}

/** Piper encoding: BOS, then each phoneme followed by PAD, then EOS. */
export function phonemeIds(ipa) {
  const ids = [...idMap['^'], ...idMap['_']];
  const missing = [];
  for (const ch of ipa) {
    const id = idMap[ch];
    if (!id) { missing.push(ch); continue; }
    ids.push(...id, ...idMap['_']);
  }
  ids.push(...idMap['$']);
  return { ids, missing };
}

export async function synth(ipa) {
  const { ids, missing } = phonemeIds(ipa);
  const t0 = performance.now();
  const { noise_scale, length_scale, noise_w } = cfg.inference;
  const out = await session.run({
    input: new ort.Tensor('int64', BigInt64Array.from(ids.map(BigInt)), [1, ids.length]),
    input_lengths: new ort.Tensor('int64', BigInt64Array.from([BigInt(ids.length)]), [1]),
    scales: new ort.Tensor('float32', Float32Array.from([noise_scale, length_scale, noise_w]), [3]),
  });
  const samples = out.output.data;
  return { samples, ms: performance.now() - t0, missing, sampleRate: cfg.audio.sample_rate };
}

let ctx;
async function play(samples, rate) {
  ctx ??= new AudioContext();
  const buf = ctx.createBuffer(1, samples.length, rate);
  buf.copyToChannel(samples, 0);
  const src = ctx.createBufferSource();
  src.buffer = buf;
  src.connect(ctx.destination);
  src.start();
}

const framed = (ipa) => (document.getElementById('frame').checked ? `seɪ ${ipa} əɡˈɛn` : ipa);

async function main() {
  const status = document.getElementById('status');
  const tbody = document.getElementById('words');
  window.spike = { load, synth, stressToNucleus, phonemeIds, WORDS };
  if (new URLSearchParams(location.search).has('bench')) return; // driven by bench.mjs
  const t = await load(new URLSearchParams(location.search).get('model') ?? 'cori');
  status.textContent = `Model fetched in ${t.fetchMs.toFixed(0)} ms, session created in ${t.createMs.toFixed(0)} ms.`;
  WORDS.forEach(([ipa, note], i) => {
    const tr = tbody.insertRow();
    tr.insertCell().textContent = String(i + 1);
    const c = tr.insertCell(); c.className = 'ipa'; c.textContent = `/${ipa}/`;
    tr.insertCell().textContent = note;
    for (const variant of [ipa, stressToNucleus(ipa)]) {
      const b = document.createElement('button');
      b.textContent = '▶';
      b.title = `/${variant}/`;
      b.addEventListener('click', async () => {
        const r = await synth(framed(variant));
        status.textContent = `/${framed(variant)}/ synthesised in ${r.ms.toFixed(0)} ms`;
        await play(r.samples, r.sampleRate);
      });
      tr.insertCell().append(b);
    }
  });
}

main().catch((e) => { document.getElementById('status').textContent = String(e); });

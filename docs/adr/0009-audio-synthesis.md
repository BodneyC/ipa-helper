# 0009. Free, sign-up-less British audio via in-browser synthesis

- Status: **Accepted** (after spike M4.1, with criterion 3 amended; see "Spike M4.1 findings")
- Date: 2026-11-04 (proposed), 2026-11-04 (accepted)
- Relates to: FR-30–FR-34, NFR-5, NFR-6, NFR-8

## Context
Users should hear (a) each symbol and (b) the built word, in British English.
Hard constraints: **free**, **no sign-up / API key** for user or maintainer, and
nothing that compromises the static-hosting model. The input is **IPA**, not
spelling. Most TTS takes text, so we need an engine that accepts phonemes.

## Options considered
1. **Web Speech API (`speechSynthesis`)**: free, built in, has en-GB voices.
   − No phoneme input. Browsers ignore SSML `<phoneme>`, so arbitrary made-up
   words can't be pronounced accurately. **Rejected** as primary (could serve
   as a "read the respelling" novelty only).
2. **Cloud TTS with SSML IPA (Azure, Google, Polly, ElevenLabs)**: high quality
   and IPA-capable. − Every one needs an account/API key, and most need billing.
   **Rejected** by FR-32.
3. **espeak-ng compiled to WASM** (e.g. `espeak-ng` emscripten builds or meSpeak):
   accepts phoneme mnemonics in `[[…]]` (Kirshenbaum-like), has an `en-gb`
   voice, is small (~1–3 MB) and fully offline. − Robotic quality. GPL-3.0 licence
   (fine if the project is GPL-compatible, or if it is loaded as a separate
   asset; needs a licence review). Needs an IPA → espeak mnemonic serialiser.
4. **Piper neural TTS in-browser (ONNX Runtime Web)**: Piper voices are
   driven by **espeak-ng IPA phoneme IDs**, so the IPA we already have maps
   almost directly onto the model's `phoneme_id_map` without needing espeak itself.
   British voices exist (e.g. `en_GB-alan`, `en_GB-southern_english_female`,
   `en_GB-cori`). Natural quality, offline after first load.
   − Model download of ~20–60 MB (lazy, cached). Per-voice licences vary,
   so pick a permissively licensed voice. WebGPU/WASM performance varies.
5. **Pre-recorded per-symbol clips** (e.g. Wikimedia Commons IPA recordings,
   various CC licences): authentic human audio for single symbols.
   − Not British-specific for vowels, needs attribution, and doesn't help with words.
6. **Pre-generated per-symbol clips at build time** (from option 3 or 4, run
   in Node/CI): static `.opus` files, instant playback, tiny runtime.

## Proposed decision
- **Symbols (M4):** ship **pre-generated static clips** (option 6) produced at
  build time by the chosen engine with a British voice. Each vowel and consonant
  is rendered in a neutral frame where needed (e.g. consonant + `ə`), and the
  frame is documented per symbol. Assets are lazy-loaded.
- **Words (M5):** **Piper in a Web Worker** (option 4), feeding phoneme IDs
  produced by a `piperPhonemeSerialiser` from the token list (stress and length
  are explicit IPA phonemes in Piper's map). **espeak-ng WASM** (option 3) is the
  fallback if the spike rejects Piper on size, licence or quality.
- Everything sits behind the `AudioPlayer` port (ARCHITECTURE §8).

## Spike M4.1: acceptance criteria to accept this ADR
1. A Piper en_GB voice with a licence compatible with public redistribution is identified and recorded.
2. A 10-word made-up list (including stress-contrastive pairs) is intelligible
   and stress audibly moves, judged by the maintainer.
3. Cold start (first word, model cached) is < 1.5 s on a mid-range laptop, and
   warm synthesis is < 300 ms per word.
4. The model is served from the same static host (or a public CDN that needs no key).
5. Every symbol in the RP inventory maps to a phoneme ID, or a documented approximation.

If criteria 1, 2 or 3 fail, re-run with espeak-ng WASM and amend this ADR.

**Criterion 3 as amended after the spike** (the original 1.5 s cold start
proved to be a floor set by runtime and weight loading, not something a
setting can tune away; the maintainer chose to amend it rather than fall
back to espeak-ng):

3. (a) Warm synthesis has a median < 300 ms per word on the reference machine.
   (b) The model session is created in a Web Worker, never on the main
   thread, and creation starts on the user's first audio request (or when
   "Sound on select" is switched on), with a visible loading state until
   it is ready. (c) Session creation takes < 3 s on the reference machine.

## Spike M4.1 findings

Spike code: `spikes/m4.1-piper/` (static page plus a headless-Chromium bench;
see its README). Reference machine: AMD Ryzen 5 7600X desktop, WSL2, headless
Chromium 1248, onnxruntime-web 1.20.1, wasm execution provider, **one thread**
(GitHub Pages cannot send COOP/COEP, ADR-0010). A mid-range laptop is expected
to be roughly twice as slow.

**Voice chosen: `en_GB-cori-medium`** (rhasspy/piper-voices).

espeak-ng WASM was **not** benchmarked. Under the rule above it is only
re-run if Piper fails criteria 1–3, and the maintainer chose to amend
criterion 3 instead. It remains the documented fallback.

| Criterion | Result |
| --- | --- |
| 1. Licence | ✅ Trained **from scratch** on public-domain LibriVox recordings; the voices repository is MIT. Other en_GB voices were rejected: `alba`, `vctk` are fine-tuned from the US `lessac` voice (unclear upstream dataset terms); `northern_english_male`, `southern_english_female` are CC-BY-SA; `semaine` is CC-BY-NC-SA; `alan`, `jenny_dioco` defer to external terms; `aru` is CC-BY 4.0 but multi-speaker Liverpool English, not RP. |
| 2. Intelligibility, stress | ✅ Judged by the maintainer: intelligible, though it struggles with some words. Stress pairs (`ˈtʃæmbɹɪk`/`tʃæmˈbɹɪk` and others) were in the list. |
| 3. Timing (amended) | ✅ (a) median 133–140 ms over seven fp32 runs. (b) is an M5.2 requirement. (c) 1.21–1.63 s. The original cold-start criterion (< 1.5 s, session creation plus first word) failed: 1.44–1.82 s. `graphOptimizationLevel` (`disabled`…`all`) made no difference beyond run-to-run noise. |
| 4. Hosting | ✅ 63.5 MB fp32 model, under Pages' 100 MB per-file limit. |
| 5. Phoneme coverage | ✅ All 56 RP inventory symbols decompose into codepoints present in the voice's `phoneme_id_map`; no approximations needed. Affricates and diphthongs are sequences (`t`+`ʃ`, `e`+`ɪ`). |

**Stress placement.** Piper's training data came from espeak-ng, which writes
the stress mark immediately before the stressed **vowel** (`flˈɒɡɪʃ`), not at
the syllable onset as dictionaries do (`ˈflɒɡɪʃ`). With onset placement the
model sometimes misbehaves: `/ˈmaʊzɛlt/` produced 3.1 s of audio against
0.68 s with nucleus placement. The synthesis serialiser (M5.1) must move each
stress mark rightwards past consonants to the next vowel.

**Terminal punctuation.** Piper's training utterances always end in
punctuation. Without it, words ending in a cluster such as /-ɛlt/ trail off
(the maintainer heard Cori "bouncing on the e and l" in /ˈmaʊzɛlt/), and
audio length becomes erratic: over three runs each, `maʊzˈɛlt` gave
1.17–3.04 s and `mˈaʊzɛlt` 0.35–0.78 s bare, against 0.71–0.86 s and
0.82–0.85 s with a final `.`. Any of `.`, ` .`, `,`, `!` stabilised all six
test words (`spikes/m4.1-piper/endings.mjs`), and the maintainer confirmed
by ear that every punctuated variant sounds right. The serialiser (M5.1)
must append `.` to every word sent to the voice. (Symbol clips end in `!`
instead; see "Symbol clips (M4.3)" below.)

**Compressed model.** Dynamic int8 quantisation (`onnxruntime.quantization`,
MatMul + Gemm + Conv weights) shrinks the model to **19.5 MB**, but session
creation is no faster (1.57–1.65 s) and warm synthesis is about 60% slower
(median 219–225 ms), because the wasm provider lacks fast int8 convolution
kernels. Quantising only MatMul/Gemm saves nothing (this voice is mostly
convolutions). **Decision: ship fp32.** It is a one-off, lazily fetched and
cached download, whereas synthesis speed is paid on every word, and the int8
margin under 300 ms would vanish on slower hardware. Revisit if download size
becomes the binding constraint (e.g. for the M7 PWA precache).

**Encoding.** Phoneme IDs are BOS `^`, then each phoneme followed by PAD `_`,
then EOS `$`. Inputs: `input` (int64 `[1, n]`), `input_lengths` (int64 `[1]`),
`scales` (float32 `[noise_scale, length_scale, noise_w]` from the voice
config: 0.667, 1, 0.8). Output: float32 PCM at 22 050 Hz.

**Pinned artefacts** (SHA-256):
- `en_GB-cori-medium.onnx`: `1899f98e5fb8310154f3c2973f4b8a929ba7245e722b3d3a85680b833d95f10d`
- `en_GB-cori-medium.onnx.json`: `e262c16d7f192f69d4edd6b4ef8a5915379e67495fcc402f1ab15eeb33da3d36`

## Symbol clips (M4.3)

Amended 2026-11-05 while implementing M4.3. The maintainer chose all three
decisions below.

- **A single sound must end in `!`, not `.`.** With only one or two phonemes,
  a final `.` makes Cori's duration predictor run on for 2–5 s of babble
  (`æ.`: 3.4–5.0 s). This is not noise: with `noise_w` at 0 the output is
  fixed, and still long (`æ.` is always 3.87 s). Ending in `!` gives stable,
  natural lengths (`æ!` 0.14–0.31 s, `pə!` 0.46–0.58 s, `aɪ!` 0.51–0.77 s).
  The probe compared `.`, ` .`, `,` and `!` over three to four takes each.
- **Frames are chosen by ear.** `pnpm audio:candidates` renders each RP sound
  in several frames and builds a listening page:
  - vowels and diphthongs as `ˈV!`, as `ˈV!` slowed (`length_scale` 1.8),
    and as `V!`;
  - consonants as `C!`, `Cə!`, `əC!` and `əCˈə!`.

  The maintainer picks one per symbol. `pnpm audio:select picks.json` then
  copies the chosen renders, byte for byte, into `src/assets/audio/symbols/`.
  `manifest.json` records each clip's frame, input text, `length_scale` and
  SHA-256, along with the voice revision, the runtime and the encoding.
- **Reproducible by procedure, not by bytes.** Piper samples noise on every
  run, so a re-render never gives identical audio. The clips the maintainer
  approved are committed, and CI does not re-render them. Instead a unit test
  checks that every sounding RP symbol has exactly one clip, that no other
  clips exist, and that each file matches its manifest hash. Anyone can re-run
  the two scripts to regenerate the clips; the voice is fetched from a pinned
  `rhasspy/piper-voices` revision (`e7229f7d33a10e145e109b886d661984201ac3c4`)
  and checked against the SHA-256 hashes above.
- **Format: Ogg Opus, mono, 48 kHz, 32 kbit/s**, at about 3–8 kB per clip.
  The clips are encoded with the pinned `ffmpeg-static` devDependency, which
  `pnpm install` fetches, so no system ffmpeg or `sudo` is needed. ffmpeg is
  used only on development machines: browsers decode the clips natively with
  `decodeAudioData`. The `+bitexact` flags make encoding deterministic, so the
  same samples always give the same bytes. The clips are rendered with
  onnxruntime-web (wasm, one thread), the runtime that M5.2 runs in the
  browser.
- **Consequence for M5.1:** a word with only one or two sounds can run away
  just as a symbol does. Before fixing the terminal `.` for words, the
  serialiser's tests must try very short words, and may need to use `!` for
  them.

## Consequences
- The model and the onnxruntime-web wasm files are **self-hosted** on the
  same static host, so audio makes no third-party requests (NFR-6). The 63.5 MB
  model is not committed to git: the build fetches it from the pinned
  Hugging Face URL and verifies the SHA-256 above (M4.3/M5.2).
- Symbol clips (M4.3) are generated with the same voice and runtime as words,
  so symbols and words sound alike. Clips end in `!` and words in `.`
  (see "Symbol clips (M4.3)").
- Introduces a large lazy asset and a Worker. Neither affects NFR-3, because
  they aren't part of the initial bundle.
- Licence notices are needed for the engine, the runtime and the voice (NFR-8).
- The project licence is **GPL-3.0-or-later** (chosen at M0.7), so bundling
  espeak-ng (GPL-3.0) is compatible and the option-3 fallback carries no extra
  licence risk. Voice model licences (option 4) still need checking during the spike.

# 0009. Free, sign-up-less British audio via in-browser synthesis

- Status: **Proposed** (to be Accepted or revised after spike M4.1)
- Date: 2026-11-04
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

## Consequences
- Introduces a large lazy asset and a Worker. Neither affects NFR-3, because
  they aren't part of the initial bundle.
- Licence notices are needed for the engine, the runtime and the voice (NFR-8).
- The project licence is **GPL-3.0-or-later** (chosen at M0.7), so bundling
  espeak-ng (GPL-3.0) is compatible and the option-3 fallback carries no extra
  licence risk. Voice model licences (option 4) still need checking during the spike.

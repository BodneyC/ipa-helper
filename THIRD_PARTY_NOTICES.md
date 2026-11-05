# Third-party notices

ipa-helper is licensed under the GNU General Public License v3.0 or later (see
[`LICENSE`](LICENSE)). It ships, or is derived from, the third-party material below.
Every licence listed here is compatible with GPL-3.0-or-later (NFR-8).

Keep this file current: any new runtime dependency, font, audio clip, voice model or
other bundled asset needs an entry **in the same commit** that adds it. Development-only
tools (linters, test runners, build tooling) are not distributed and are not listed. To
re-check the bundled npm packages, run `pnpm licenses list --prod`.

## Bundled JavaScript

| Package | Version | Licence | Copyright |
| --- | --- | --- | --- |
| [react](https://github.com/facebook/react) | 19.3.1 | MIT | Meta Platforms, Inc. and affiliates |
| [react-dom](https://github.com/facebook/react) | 19.3.1 | MIT | Meta Platforms, Inc. and affiliates |
| [scheduler](https://github.com/facebook/react) | 0.28.0 | MIT | Meta Platforms, Inc. and affiliates |

## Design

| Work | Use | Licence | Copyright |
| --- | --- | --- | --- |
| [Gruvbox](https://github.com/morhetz/gruvbox) colour palette | Colour values in `src/styles/tokens.css` (ADR-0006) | MIT | Pavel Pertsev (morhetz) |

## Fonts

Both fonts are subset by `scripts/subset-fonts.sh` (glyphs outside the ranges in
`src/styles/fonts.css` are removed and the result converted to woff2). Under the
OFL a subset is a *Modified Version*. Charis SIL declares the Reserved Font Names
"Charis" and "SIL", and OFL §3 bars a Modified Version from using them, so the
script renames the subset to **ipa-helper IPA** (internal name table and CSS
`font-family`). JetBrains Mono declares no Reserved Font Name and keeps its name.
The full licence text ships next to each file.

| Font | Version | File | Licence | Copyright |
| --- | --- | --- | --- | --- |
| [Charis SIL](https://software.sil.org/charis/), subset and renamed "ipa-helper IPA" | 7.000 | `public/fonts/ipa-helper-ipa.woff2` | SIL Open Font License 1.1 ([`OFL-CharisSIL.txt`](public/fonts/OFL-CharisSIL.txt)) | SIL Global |
| [JetBrains Mono](https://www.jetbrains.com/lp/mono/), subset | 2.304 | `public/fonts/jetbrains-mono-ascii.woff2` | SIL Open Font License 1.1 ([`OFL-JetBrainsMono.txt`](public/fonts/OFL-JetBrainsMono.txt)) | The JetBrains Mono Project Authors |

The OFL permits bundling these fonts with GPL software; the fonts themselves stay
under the OFL. The app icons in `public/icons/` are images of a glyph from the
"ipa-helper IPA" subset (`pnpm icons:render`). The OFL places no restriction on
images made with the font.

## Audio and voice models

The app's voice is the Piper voice **Cori (medium)** (ADR-0009). Its audio
reaches the app in two ways: as symbol clips rendered ahead of time (M4.3),
and from M5 as the model itself, run in the browser to speak whole words.

| Work | Use | Licence | Copyright |
| --- | --- | --- | --- |
| [Cori (medium)](https://brycebeattie.com/files/tts/), `en_GB-cori-medium` from [rhasspy/piper-voices](https://huggingface.co/rhasspy/piper-voices) at revision `e7229f7d33a1` | Rendered the symbol clips in `src/assets/audio/symbols/*.opus`. From M5.2 the model is served from the same host and run in the browser | Public domain, as declared by its author; it was trained from scratch on LibriVox recordings. The piper-voices repository is MIT | Voice trained by Bryce Beattie; recordings by LibriVox volunteers (public domain) |
| Symbol clips, `src/assets/audio/symbols/*.opus` | Played for each symbol (FR-30) | Output of the public-domain voice above. Distributed with this project under GPL-3.0-or-later | ipa-helper contributors |
| [Piper](https://github.com/rhasspy/piper) (engine) | Defines the voice's model format and the phoneme-ID input encoding the app follows. No Piper code is distributed | MIT | Michael Hansen |
| [onnxruntime-web](https://github.com/microsoft/onnxruntime) (runtime) | 1.20.1, wasm. Runs the voice in the synthesis worker (`synth.worker-*.js` and `ort-wasm-simd-threaded-*.wasm`), and renders the symbol clips at build time | MIT | Microsoft Corporation |

The model (`voice/en_GB-cori-medium.*.onnx`) is fetched at deploy time from
the pinned revision above. It is served from the same host and never committed.

## Bundled in the synthesis worker

onnxruntime-web's prebuilt bundle (`ort.bundle.min.mjs`) embeds these packages.
They are part of the worker chunk, which loads only when a word is first
played. This list comes from what is actually in the built
`synth.worker-*.js`, not from the dependency tree: protobufjs and platform are
dependencies of onnxruntime-web but are not in the bundle. Re-check whenever
onnxruntime-web is upgraded.

| Package | Version | Licence | Copyright |
| --- | --- | --- | --- |
| [onnxruntime-common](https://github.com/microsoft/onnxruntime) | 1.20.1 | MIT | Microsoft Corporation |
| [flatbuffers](https://github.com/google/flatbuffers) | 1.12.0 | Apache-2.0 ([`LICENSES/Apache-2.0.txt`](LICENSES/Apache-2.0.txt)) | The FlatBuffers project (Google) |
| [long](https://github.com/dcodeIO/long.js) | 5.3.2 | Apache-2.0 ([`LICENSES/Apache-2.0.txt`](LICENSES/Apache-2.0.txt)) | Daniel Wirtz / The long.js Authors; portions The Closure Library Authors |
| [guid-typescript](https://github.com/NicolasDeveloper/guid-typescript) | 1.0.9 | ISC | Nicolas (the package's author) |

Apache-2.0 is compatible with GPL-3.0-or-later (but not with GPL-2.0), and so
is ISC. The ISC terms are:

```text
Permission to use, copy, modify, and/or distribute this software for any purpose
with or without fee is hereby granted, provided that the above copyright notice
and this permission notice appear in all copies.

THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES WITH
REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF MERCHANTABILITY AND
FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR ANY SPECIAL, DIRECT,
INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES WHATSOEVER RESULTING FROM LOSS
OF USE, DATA OR PROFITS, WHETHER IN AN ACTION OF CONTRACT, NEGLIGENCE OR OTHER
TORTIOUS ACTION, ARISING OUT OF OR IN CONNECTION WITH THE USE OR PERFORMANCE OF
THIS SOFTWARE.
```

---

## MIT License text

The packages and works marked MIT above are provided under the following terms, with
the copyright notice shown in their row:

```text
MIT License

Copyright (c) <copyright holders>

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

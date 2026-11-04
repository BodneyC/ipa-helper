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

*None yet.* Charis SIL (SIL Open Font License 1.1) and a monospace font are added in
roadmap task M2.2.

## Audio and voice models

*None yet.* See ADR-0009 and roadmap tasks M4.5 and M5.

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

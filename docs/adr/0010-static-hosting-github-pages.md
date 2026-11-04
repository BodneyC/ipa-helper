# 0010. Static hosting on GitHub Pages via Actions

- Status: Accepted
- Date: 2026-11-04
- Relates to: NFR-5, NFR-6

## Context
The app is purely static, with no back end. Hosting should be free, need no
extra account beyond the code host, and deploy from CI.

## Options considered
GitHub Pages, Cloudflare Pages, Netlify, Vercel. All are free tiers. Pages needs
no extra account and integrates with Actions directly.

## Decision
Deploy `dist/` to GitHub Pages using `actions/upload-pages-artifact` +
`actions/deploy-pages` on pushes to `main`, after all gates pass. Vite `base` is
set from an env var so the build works at a sub-path (`/ipa-helper/`) and at root.
Large audio models (ADR-0009) are served as Pages assets if within limits;
otherwise this ADR is superseded.

## Consequences
- Pages' per-file limit (100 MB) and soft site limit (1 GB) cap the size of the voice model.
- No custom headers. COOP/COEP for `SharedArrayBuffer` aren't available, so
  ONNX Runtime must run in its non-threaded WASM mode (or via a
  `coi-serviceworker` shim). Account for this in spike M4.1.

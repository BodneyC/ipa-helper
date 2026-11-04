# Spike M4.1: Piper `en_GB-cori-medium` in the browser

Throwaway code for ADR-0009. Not part of the app: not built, linted or
formatted, and never imported from `src/`. Findings live in
`docs/adr/0009-audio-synthesis.md`.

## Run

From the repo root:

```sh
spikes/m4.1-piper/fetch-model.sh                      # ~63 MB into model/
python3 -m http.server -d spikes/m4.1-piper 8000      # then open http://localhost:8000
node spikes/m4.1-piper/bench.mjs [model] [opt-level]  # headless timings + WAVs in out/<model>/
```

`?model=cori.int8-all` on the page URL switches to the quantised copy.

## Quantised copy (optional)

```sh
python3 -m venv spikes/m4.1-piper/.venv
spikes/m4.1-piper/.venv/bin/pip install onnx onnxruntime
spikes/m4.1-piper/.venv/bin/python -I spikes/m4.1-piper/quantise.py
```

## Files

- `index.html`, `spike.js`: listening page (dictionary vs nucleus stress placement).
- `bench.mjs`: Playwright bench, served without COOP/COEP like GitHub Pages.
- `quantise.py`: int8 dynamic quantisation.
- `fetch-model.sh`: downloads the voice and its model card.

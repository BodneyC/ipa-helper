#!/usr/bin/env bash
# Spike M4.1: download the Piper en_GB-cori-medium voice (~63 MB) into ./model/.
set -euo pipefail
cd "$(dirname "$0")"
mkdir -p model
base=https://huggingface.co/rhasspy/piper-voices/resolve/main/en/en_GB/cori/medium
curl -fL "$base/en_GB-cori-medium.onnx.json" -o model/cori.onnx.json
curl -fL "$base/en_GB-cori-medium.onnx" -o model/cori.onnx
curl -fL "$base/MODEL_CARD" -o model/MODEL_CARD

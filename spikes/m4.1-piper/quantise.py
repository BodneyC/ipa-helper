"""Spike M4.1 (ADR-0009): make int8 copies of the Cori voice for comparison.

Throwaway. Usage (from the repo root):
    python3 -m venv spikes/m4.1-piper/.venv
    spikes/m4.1-piper/.venv/bin/pip install onnx onnxruntime
    spikes/m4.1-piper/.venv/bin/python -I spikes/m4.1-piper/quantise.py

Writes two variants next to the fp32 model:
  cori.int8-matmul.onnx  only MatMul/Gemm weights quantised (attention, text encoder)
  cori.int8-all.onnx     MatMul plus Conv weights quantised (most of the decoder)
"""

import shutil
import sys
from pathlib import Path

from onnxruntime.quantization import QuantType, quantize_dynamic

model = Path(sys.argv[0]).resolve().parent / "model"
src = model / "cori.onnx"

for name, ops in [("int8-matmul", ["MatMul", "Gemm"]), ("int8-all", ["MatMul", "Gemm", "Conv"])]:
    dst = model / f"cori.{name}.onnx"
    quantize_dynamic(src, dst, weight_type=QuantType.QUInt8, op_types_to_quantize=ops)
    shutil.copy(model / "cori.onnx.json", model / f"cori.{name}.onnx.json")
    print(f"{dst.name}: {dst.stat().st_size / 1e6:.1f} MB (fp32 {src.stat().st_size / 1e6:.1f} MB)")

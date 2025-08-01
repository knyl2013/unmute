#!/bin/bash
set -ex
cd "$(dirname "$0")/.."

uv tool run vllm serve \
  --model=google/gemma-3-12b-it \
  --max-model-len=8192 \
  --dtype=bfloat16 \
  --gpu-memory-utilization=0.3 \
  --port=8091

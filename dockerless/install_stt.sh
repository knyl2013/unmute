#!/bin/bash
set -ex
cd "$(dirname "$0")/.."

# A fix for building Sentencepiece on GCC 15, see: https://github.com/google/sentencepiece/issues/1108
export CXXFLAGS="-include cstdint"
export CUDA_COMPUTE_CAP=8.6

cargo install --features cuda moshi-server@0.6.3

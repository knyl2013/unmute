#!/bin/bash
set -ex
# Remeber to run on cuda12.1 machine
# Remeber to set export HF_TOKEN=xxxx..
curl -LsSf https://astral.sh/uv/install.sh | sh
curl https://sh.rustup.rs -sSf | sh
curl -fsSL https://get.pnpm.io/install.sh | sh -
eval "$(cat ~/.bashrc | tail -n +10)"
apt-get update
apt-get install -y vim libssl-dev pkg-config cmake
./dockerless/start_frontend.sh &
./dockerless/start_backend.sh &
./dockerless/start_llm.sh &
./dockerless/start_stt.sh &
./dockerless/start_tts.sh &
wait


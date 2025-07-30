#!/bin/bash
set -ex
cd "$(dirname "$0")/.."

cd frontend-new
pnpm install
pnpm env use --global lts
pnpm dev

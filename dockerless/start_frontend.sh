#!/bin/bash
set -ex
cd "$(dirname "$0")/.."

cd frontend-new
nvm install 20.19.0 
nvm use 20.19.0
pnpm install
pnpm env use --global lts
pnpm dev

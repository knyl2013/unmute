#!/bin/bash
# start-services.sh (Final Corrected Version)

# Exit immediately if a command exits with a non-zero status.
set -e

echo "--- Upgrading moshi package at runtime ---"
# Use 'uv pip install' as a replacement for 'pip install'
uv pip install moshi --upgrade
echo "--- Upgrade complete ---"

echo "--- Starting STT Service ---"
# Start the STT worker in the background using the explicit path
exec uv run --locked --project /app/moshi-server moshi-server worker --config /app/moshi-server/configs/stt.toml &

# Wait for STT to be healthy
echo "Waiting for STT service to be ready on port 8082..."
while ! curl -s -f http://localhost:8082/api/build_info > /dev/null; do
    echo -n "."
    sleep 2
done
echo "STT service is ready!"


echo "--- Starting TTS Service ---"
# Start the TTS worker in the background using the explicit path
exec uv run --locked --project /app/moshi-server moshi-server worker --config /app/moshi-server/configs/tts.toml &

# Wait for TTS to be healthy
echo "Waiting for TTS service to be ready on port 8081..."
while ! curl -s -f http://localhost:8081/api/build_info > /dev/null; do
    echo -n "."
    sleep 2
done
echo "TTS service is ready!"


echo "--- Starting Backend Service ---"
# The backend command is fine as is, since 'uvicorn' is not a conflicting name.
cd /app/backend
exec uv run --no-dev uvicorn unmute.main_websocket:app --reload --host 0.0.0.0 --port 8000 --ws-per-message-deflate=false
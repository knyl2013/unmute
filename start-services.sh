#!/bin/bash

# Exit immediately if a command exits with a non-zero status.
set -e

echo "--- Starting STT Service ---"
# Start the STT worker in the background using the explicit path
uv run --locked --project /app/moshi-server /app/moshi-server/start_moshi_server_public.sh worker --config /app/moshi-server/configs/stt.toml --port 8090 &

# Wait for STT to be healthy
echo "Waiting for STT service to be ready on port 8090..."
while ! curl -s -f http://localhost:8090/api/build_info > /dev/null; do
    echo -n "."
    sleep 2
done
echo "STT service is ready!"


echo "--- Starting TTS Service ---"
# Start the TTS worker in the background using the explicit path
uv run --locked --project /app/moshi-server /app/moshi-server/start_moshi_server_public.sh worker --config /app/moshi-server/configs/tts.toml --port 8089 &

# Wait for TTS to be healthy
echo "Waiting for TTS service to be ready on port 8089..."
while ! curl -s -f http://localhost:8089/api/build_info > /dev/null; do
    echo -n "."
    sleep 2
done
echo "TTS service is ready!"


echo "--- Starting Backend Service ---"
# The backend command is fine as is, since 'uvicorn' is not a conflicting name.
cd /app
exec uv run --no-dev uvicorn unmute.main_websocket:app --reload --host 0.0.0.0 --port 8000 --ws-per-message-deflate=false
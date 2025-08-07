#!/bin/bash

# Exit immediately if a command exits with a non-zero status.
set -e

echo "--- Starting TTS Service ---"
# Start the TTS worker in the background
# NOTE: The internal port for TTS is 8081 (from our previous supervisord.conf)
uv run --locked --project /app/moshi-server moshi-server worker --config /app/moshi-server/configs/tts.toml &

# Wait for TTS to be healthy
echo "Waiting for TTS service to be ready on port 8081..."
while ! curl -s -f http://localhost:8081/api/build_info > /dev/null; do
    echo -n "."
    sleep 2
done
echo "TTS service is ready!"

echo "--- Starting STT Service ---"
# Start the STT worker in the background
# NOTE: The internal port for STT is 8082 (from our previous supervisord.conf)
uv run --locked --project /app/moshi-server moshi-server worker --config /app/moshi-server/configs/stt.toml &

# Wait for STT to be healthy
echo "Waiting for STT service to be ready on port 8082..."
while ! curl -s -f http://localhost:8082/api/build_info > /dev/null; do
    echo -n "."
    sleep 2
done
echo "STT service is ready!"


echo "--- Starting Backend Service ---"
# Start the backend service in the foreground.
# The 'exec' command replaces the script process with the uvicorn process.
# This is crucial for proper signal handling (e.g., when 'docker stop' is called).
cd /app/backend
exec uv run --no-dev uvicorn unmute.main_websocket:app --reload --host 0.0.0.0 --port 8000 --ws-per-message-deflate=false
#!/bin/bash
set -e # Exit immediately if a command exits with a non-zero status.

# --- Helper Function to Wait for a Port ---
# Usage: wait_for_port PORT_NUMBER SERVICE_NAME
wait_for_port() {
  local port="$1"
  local service_name="$2"
  echo "Waiting for $service_name on port $port..."
  # 'ss' is modern, 'netstat' is a fallback.
  # We loop until the command to check the port succeeds (exit code 0)
  while ! (ss -tln | grep -q ":$port\b") && ! (netstat -tln | grep -q ":$port\b"); do
    sleep 2 # wait for 2 seconds before checking again
  done
  echo "$service_name is up and running!"
}

# --- Initial Setup (from your script) ---
echo "Running one-time setup..."
curl -LsSf https://astral.sh/uv/install.sh | sh
curl https://sh.rustup.rs -sSf -- -y # Adding -y to make it non-interactive
curl -fsSL https://get.pnpm.io/install.sh | sh -
eval "$(cat ~/.bashrc | tail -n +10)"
sudo apt-get update
sudo apt-get install -y vim libssl-dev pkg-config cmake
echo "All setup complete. Starting services sequentially..."

# --- Sequential Service Startup ---
# 1. Start Frontend
./dockerless/start_frontend.sh &
wait_for_port 3000 "Frontend"

# 2. Start Backend
./dockerless/start_backend.sh &
wait_for_port 8000 "Backend"

# 3. Start LLM Service
./dockerless/start_llm.sh &
wait_for_port 8091 "LLM Service"

# 4. Start STT (Speech-to-Text) Service
./dockerless/start_stt.sh &
wait_for_port 8090 "STT Service"

# 5. Start TTS (Text-to-Speech) Service in the FOREGROUND
echo "Starting TTS Service (in the foreground)..."
# This last command does NOT have an '&'. This is what keeps the script running.
./dockerless/start_tts.sh

echo "TTS service (and the main script) has terminated."
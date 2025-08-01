#!/bin/bash
set -e # Exit immediately if a command exits with a non-zero status.

# --- Helper Function to Wait for a Port ---
# Usage: wait_for_port PORT_NUMBER SERVICE_NAME
wait_for_port() {
  local port="$1"
  local service_name="$2"
  echo "--> Waiting for $service_name on port $port..."
  # 'ss' is modern, 'netstat' is a fallback.
  # We loop until the command to check the port succeeds (exit code 0)
  while ! (ss -tln | grep -q ":$port\b") && ! (netstat -tln | grep -q ":$port\b"); do
    sleep 2 # wait for 2 seconds before checking again
  done
  echo "--> SUCCESS: $service_name is up and running!"
}

# --- Helper Function for Initial Setup ---
run_initial_setup() {
  echo "--- Running one-time initial setup ---"
  curl -LsSf https://astral.sh/uv/install.sh | sh
  curl https://sh.rustup.rs -sSf | sh
  curl -fsSL https://get.pnpm.io/install.sh | sh -

  eval "$(cat ~/.bashrc | tail -n +10)"

  echo "--- Installing system dependencies ---"
  apt-get update
apt-get install -y vim libssl-dev pkg-config cmake net-tools
  echo "--- Initial setup complete ---"
}


# --- Main Logic ---

# Check if the first argument is "no-init".
# If it's anything else (or empty), run the setup.
if [ "$1" != "no-init" ]; then
  run_initial_setup
else
  echo "--- Skipping initial setup as requested by 'no-init' argument. ---"
  # Even if we skip setup, we still need to source the bashrc to get the PATHs
  source "$HOME/.bashrc"
fi


echo ""
echo "--- Starting services sequentially ---"
echo ""

# --- Sequential Service Startup ---

# 1. Start Frontend
# echo "Starting Frontend..."
# ./dockerless/start_frontend.sh &
# wait_for_port 3000 "Frontend"

# 2. Start Backend
# echo "Starting Backend..."
# ./dockerless/start_backend.sh &
# wait_for_port 8000 "Backend"

# 3. Start LLM Service
if [ -z "$KYUTAI_LLM_URL" ]; then
  echo "--> KYUTAI_LLM_URL is not set. Starting local LLM service..."
  ./dockerless/start_llm.sh &
  wait_for_port 8091 "LLM Service"
else
  echo "--> KYUTAI_LLM_URL is set to '$KYUTAI_LLM_URL'."
  echo "--> Skipping local LLM service startup to save resources."
fi

# 4. Start STT (Speech-to-Text) Service
echo "Starting STT Service..."
./dockerless/start_stt.sh &
wait_for_port 8090 "STT Service"

# 5. Start TTS (Text-to-Speech) Service in the FOREGROUND
echo "Starting TTS Service (in the foreground)..."
# This last command does NOT have an '&'. This is what keeps the script running.
./dockerless/start_tts.sh

echo "TTS service (and the main script) has terminated."
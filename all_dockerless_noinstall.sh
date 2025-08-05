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

echo ""
echo "--- Starting services sequentially ---"
echo ""

# --- Sequential Service Startup ---

SCRIPT_DIR=$( cd -- "$( dirname -- "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )

# 1. Start Frontend
# echo "Starting Frontend..."
# bash "$SCRIPT_DIR/dockerless/start_frontend.sh" &
# wait_for_port 3000 "Frontend"

# 2. Start Backend
echo "Starting Backend..."
bash "$SCRIPT_DIR/dockerless/start_backend.sh" &
wait_for_port 8000 "Backend"

# 3. Start LLM Service
if [ -z "$KYUTAI_LLM_URL" ]; then
  echo "--> KYUTAI_LLM_URL is not set. Starting local LLM service..."
  bash "$SCRIPT_DIR/dockerless/start_llm.sh" &
  wait_for_port 8091 "LLM Service"
else
  echo "--> KYUTAI_LLM_URL is set to '$KYUTAI_LLM_URL'."
  echo "--> Skipping local LLM service startup to save resources."
fi

# 4. Start STT (Speech-to-Text) Service
echo "Starting STT Service..."
bash "$SCRIPT_DIR/dockerless/start_stt_noinstall.sh" &
wait_for_port 8090 "STT Service"

# 5. Start TTS (Text-to-Speech) Service in the FOREGROUND
echo "Starting TTS Service (in the foreground)..."
# This last command does NOT have an '&'. This is what keeps the script running.
bash "$SCRIPT_DIR/dockerless/start_tts_noinstall.sh"

echo "TTS service (and the main script) has terminated."
# =========================================================================
# BUILDER STAGE: Compile all dependencies using the RunPod devel image
# =========================================================================
# Use the same base image you use on RunPod for the build environment
FROM runpod/pytorch:2.2.0-py3.10-cuda12.1.1-devel-ubuntu22.04 as builder

# Set the working directory to match your RunPod setup
WORKDIR /workspace

# Prevent apt-get from asking questions
ENV DEBIAN_FRONTEND=noninteractive

# Install system dependencies needed for Rust build and Supervisor
# The base image has python, but we need build tools and supervisor.
RUN apt-get update && apt-get install -y \
    build-essential \
    wget \
    curl \
    pkg-config \
    libssl-dev \
    supervisor \
    && rm -rf /var/lib/apt/lists/*

# Install uv (a fast Python package installer)
# The runpod image might already have it, but this ensures it.
RUN pip3 install uv

# Install Rust
ENV PATH="/root/.cargo/bin:${PATH}"
RUN curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y

# --- Build moshi-server (for both TTS and STT) ---
# This replicates the setup from your tts script
RUN \
    mkdir -p /workspace/dockerless && \
    cd /workspace/dockerless && \
    wget https://raw.githubusercontent.com/kyutai-labs/moshi/9837ca328d58deef5d7a4fe95a0fb49c902ec0ae/rust/moshi-server/pyproject.toml && \
    wget https://raw.githubusercontent.com/kyutai-labs/moshi/9837ca328d58deef5d7a4fe95a0fb49c902ec0ae/rust/moshi-server/uv.lock && \
    uv venv && \
    uv sync --locked && \
    export LD_LIBRARY_PATH=$(.venv/bin/python -c 'import sysconfig; print(sysconfig.get_config_var("LIBDIR"))') && \
    export CXXFLAGS="-include cstdint" && \
    # Install the moshi-server binary system-wide inside the builder
    cargo install --features cuda moshi-server@0.6.3 --force --root /usr/local

# --- Prepare Backend Python Environment ---
# Copy your backend project files into the builder
COPY . .
# Create and populate a separate virtual environment for the backend service
RUN uv venv /workspace/backend_venv && \
    # Assuming your backend dependencies are in a pyproject.toml at the root
    uv sync --venv /workspace/backend_venv --locked pyproject.toml

# =========================================================================
# FINAL STAGE: The small, runnable image
# =========================================================================
# Use a smaller runtime image for the final product.
FROM nvidia/cuda:12.1.1-runtime-ubuntu22.04

WORKDIR /workspace

# Install runtime dependencies: Python and Supervisor
RUN apt-get update && apt-get install -y \
    python3.10 \
    python3.10-venv \
    supervisor \
    && rm -rf /var/lib/apt/lists/*

# Copy only the necessary build artifacts from the builder stage
COPY --from=builder /usr/local/bin/moshi-server /usr/local/bin/
COPY --from=builder /workspace/dockerless/.venv /workspace/dockerless/.venv
COPY --from=builder /workspace/backend_venv /workspace/backend_venv

# Copy your application code and configuration files
COPY . .

# Copy the supervisor configuration file into the container
COPY supervisord.conf /etc/supervisor/conf.d/supervisord.conf

# Expose the backend port, matching your RunPod config
EXPOSE 8000
# You can also expose the others if needed for debugging
# EXPOSE 8089 8090

# The CMD instruction tells Docker what to run when the container starts.
# This replaces the "Container Start Command" in RunPod.
CMD ["/usr/bin/supervisord", "-c", "/etc/supervisor/conf.d/supervisord.conf"]
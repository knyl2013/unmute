# Dockerfile for RunPod Template

# Stage 1: Build the moshi-server (for tts and stt)
FROM nvidia/cuda:12.1.0-devel-ubuntu22.04 AS moshi-builder

# Install base dependencies and Rust/uv
ENV DEBIAN_FRONTEND=noninteractive
RUN apt-get update && apt-get install -y \
    curl build-essential ca-certificates libssl-dev git pkg-config \
    cmake wget openssh-client --no-install-recommends && \
    rm -rf /var/lib/apt/lists/*
RUN curl https://sh.rustup.rs -sSf | sh -s -- -y
ENV PATH="/root/.cargo/bin:$PATH"
COPY --from=ghcr.io/astral-sh/uv:0.7.2 /uv /bin/

WORKDIR /app
ENV RUST_BACKTRACE=1

# Replicate the original behavior: download the dependency manifest and lockfile from GitHub.
RUN wget https://raw.githubusercontent.com/kyutai-labs/moshi/a40c5612ade3496f4e4aa47273964404ba287168/rust/moshi-server/pyproject.toml
RUN wget https://raw.githubusercontent.com/kyutai-labs/moshi/a40c5612ade3496f4e4aa47273964404ba287168/rust/moshi-server/uv.lock

# Now, install dependencies using the downloaded files. 'uv' will find them in the current directory.
RUN uv run --locked --project . echo "Moshi dependencies installed."

# Finally, copy the local moshi-server files (like configs, scripts) into the build stage.
# This assumes your local configs are in 'services/moshi-server/'.
COPY services/moshi-server/ ./


# Stage 2: Build the backend service
# This stage should be correct as the backend's pyproject.toml and uv.lock are likely in the project root.
FROM ghcr.io/astral-sh/uv:0.6.17-debian AS backend-builder
WORKDIR /app
ENV UV_COMPILE_BYTECODE=1 UV_LOCKED=1

# Copy dependency files from the project root first.
COPY pyproject.toml uv.lock ./

# Now, install backend python dependencies.
RUN uv run --no-dev echo "Backend dependencies installed."

# Finally, copy the rest of the backend source code.
COPY . .


# Final Stage: Create the runnable image for RunPod
FROM nvidia/cuda:12.1.0-devel-ubuntu22.04 AS final

# Install final runtime dependencies, including supervisor
ENV DEBIAN_FRONTEND=noninteractive
RUN apt-get update && apt-get install -y \
    curl \
    supervisor \
    --no-install-recommends && \
    rm -rf /var/lib/apt/lists/*

# Copy uv, cargo, and rust from the moshi-builder stage for the runtime environment
ENV PATH="/root/.cargo/bin:$PATH"
COPY --from=moshi-builder /root/.cargo /root/.cargo
COPY --from=ghcr.io/astral-sh/uv:0.7.2 /uv /bin/

# Copy the built moshi-server app into its own directory
WORKDIR /app/moshi-server
COPY --from=moshi-builder /app ./

# Copy the built backend app into its own directory
WORKDIR /app/backend
COPY --from=backend-builder /app ./

# Copy the supervisor configuration
COPY supervisord.conf /etc/supervisor/conf.d/supervisord.conf

# Expose port 8000 for the backend service. RunPod will use this.
EXPOSE 8000

# Set a healthcheck. RunPod uses this to know when the service is ready.
HEALTHCHECK --start-period=60s --interval=15s --timeout=5s \
  CMD curl -f http://localhost:8000/metrics || exit 1

# The main command to start all services via supervisord
ENTRYPOINT ["/usr/bin/supervisord", "-c", "/etc/supervisor/supervisord.conf"]
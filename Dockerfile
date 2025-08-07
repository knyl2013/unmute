# Dockerfile for RunPod Template (Sequential Startup)

# Stage 1: Build the moshi-server (for tts and stt)
FROM nvidia/cuda:12.1.0-devel-ubuntu22.04 AS moshi-builder
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
RUN wget https://raw.githubusercontent.com/kyutai-labs/moshi/a40c5612ade3496f4e4aa47273964404ba287168/rust/moshi-server/pyproject.toml
RUN wget https://raw.githubusercontent.com/kyutai-labs/moshi/a40c5612ade3496f4e4aa47273964404ba287168/rust/moshi-server/uv.lock
RUN uv run --locked --project . echo "Moshi dependencies installed."
COPY services/moshi-server/ ./

# Stage 2: Build the backend service
FROM ghcr.io/astral-sh/uv:0.6.17-debian AS backend-builder
WORKDIR /app
ENV UV_COMPILE_BYTECODE=1 UV_LOCKED=1
COPY pyproject.toml uv.lock ./
RUN uv run --no-dev echo "Backend dependencies installed."
COPY . .

# Final Stage: Create the runnable image for RunPod
FROM nvidia/cuda:12.1.0-devel-ubuntu22.04 AS final

# Install final runtime dependencies, but we no longer need supervisor.
ENV DEBIAN_FRONTEND=noninteractive
RUN apt-get update && apt-get install -y \
    curl \
    --no-install-recommends && \
    rm -rf /var/lib/apt/lists/*

# Copy runtime tools (Rust, uv)
ENV PATH="/root/.cargo/bin:$PATH"
COPY --from=moshi-builder /root/.cargo /root/.cargo
COPY --from=ghcr.io/astral-sh/uv:0.7.2 /uv /bin/

# Copy the built applications
WORKDIR /app/moshi-server
COPY --from=moshi-builder /app ./
WORKDIR /app/backend
COPY --from=backend-builder /app ./

# Copy the startup script and make it executable
COPY start-services.sh /usr/local/bin/start-services.sh
RUN chmod +x /usr/local/bin/start-services.sh

# Expose port 8000 for the backend service.
EXPOSE 8000

# Healthcheck remains the same, as it checks the final service.
HEALTHCHECK --start-period=60s --interval=15s --timeout=5s \
  CMD curl -f http://localhost:8000/metrics || exit 1

# Set the entrypoint to our custom script.
ENTRYPOINT ["start-services.sh"]
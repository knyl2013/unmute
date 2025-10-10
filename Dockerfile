# Dockerfile for RunPod Template (Sequential Startup)

FROM ghcr.io/astral-sh/uv:0.6.17-debian AS backend-builder
WORKDIR /app
ENV UV_COMPILE_BYTECODE=1 UV_LOCKED=1
COPY pyproject.toml uv.lock ./
RUN uv run --no-dev echo "Backend dependencies installed."
COPY . .

FROM nvidia/cuda:12.8.0-devel-ubuntu22.04 AS moshi-builder
ENV DEBIAN_FRONTEND=noninteractive
RUN apt-get update && apt-get install -y \
    curl \
    build-essential \
    ca-certificates \
    libssl-dev \
    git \
    pkg-config \
    cmake \
    wget \
    openssh-client \
    --no-install-recommends && \
    rm -rf /var/lib/apt/lists/*
RUN curl https://sh.rustup.rs -sSf | sh -s -- -y
ENV PATH="/root/.cargo/bin:$PATH"
COPY --from=ghcr.io/astral-sh/uv:0.7.2 /uv /uvx /bin/
ENV RUST_BACKTRACE=1
COPY services/moshi-server/ /app/moshi-server/
WORKDIR /app/moshi-server
RUN wget https://raw.githubusercontent.com/kyutai-labs/moshi/bf359af7694add34c13e65d2f009f0cb474d87cc/rust/moshi-server/pyproject.toml
RUN wget https://raw.githubusercontent.com/kyutai-labs/moshi/bf359af7694add34c13e65d2f009f0cb474d87cc/rust/moshi-server/uv.lock
WORKDIR /app
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
# ENTRYPOINT ["start-services.sh"]
CMD ["bash", "start-services.sh"]

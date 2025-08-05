# =========================================================================
# STAGE 1: PLANNER - Calculate the dependency tree
# =========================================================================
# We start from a slim rust image just to calculate dependencies.
FROM rust:1.78-slim as planner
WORKDIR /app

# Install cargo-chef
RUN cargo install cargo-chef

# Copy only the files needed to determine dependencies
COPY ./Cargo.toml ./Cargo.toml
COPY ./Cargo.lock ./Cargo.lock
# If you have a .cargo/config.toml or workspace members, copy them too
# COPY ./.cargo ./.cargo
# COPY ./my-crate/src ./my-crate/src

# Calculate the dependency plan. This is very fast.
RUN cargo chef prepare --recipe-path recipe.json


# =========================================================================
# STAGE 2: CACHER - Build only the dependencies
# =========================================================================
# We now switch to the full CUDA development image for the heavy compilation.
FROM runpod/pytorch:2.2.0-py3.10-cuda12.1.1-devel-ubuntu22.04 as cacher
WORKDIR /app

# Install system dependencies and Rust
ENV DEBIAN_FRONTEND=noninteractive
RUN apt-get update && apt-get install -y build-essential pkg-config libssl-dev && \
    rm -rf /var/lib/apt/lists/*
ENV PATH="/root/.cargo/bin:${PATH}"
RUN curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y

# Install cargo-chef
RUN cargo install cargo-chef

# Copy the dependency recipe from the planner stage
COPY --from=planner /app/recipe.json recipe.json

# This is the most resource-intensive step, but it will be cached!
# It compiles *only* the third-party dependencies.
# We set the CXXFLAGS here as needed for sentencepiece.
RUN export CXXFLAGS="-include cstdint" && cargo chef cook --release --recipe-path recipe.json


# =========================================================================
# STAGE 3: BUILDER - Build the final application binary
# =========================================================================
# We can continue in the same image or switch back to a smaller one if needed.
# For simplicity, we'll continue here.
FROM cacher as builder
WORKDIR /app

# Copy the pre-compiled dependencies from the cacher stage.
COPY --from=cacher /app/target /app/target
COPY --from=cacher /root/.cargo /root/.cargo

# Copy your application's source code
COPY . .

# Set up the Python environment required by the build
# This part is still necessary for moshi-server
RUN pip3 install uv
RUN \
    mkdir -p /app/dockerless && \
    cd /app/dockerless && \
    wget https://raw.githubusercontent.com/kyutai-labs/moshi/9837ca328d58deef5d7a4fe95a0fb49c902ec0ae/rust/moshi-server/pyproject.toml && \
    wget https://raw.githubusercontent.com/kyutai-labs/moshi/9837ca328d58deef5d7a4fe95a0fb49c902ec0ae/rust/moshi-server/uv.lock && \
    uv venv && \
    uv sync --locked

# Build the application binary. This step is now very fast and uses few resources
# because all dependencies are already compiled.
# Instead of `cargo install`, we now use `cargo build`.
RUN export LD_LIBRARY_PATH=$(/app/dockerless/.venv/bin/python -c 'import sysconfig; print(sysconfig.get_config_var("LIBDIR"))') && \
    export CXXFLAGS="-include cstdint" && \
    cargo build --release --bin moshi-server --features cuda

# --- Also prepare the backend Python environment ---
RUN uv venv /app/backend_venv && \
    uv sync --venv /app/backend_venv --locked pyproject.toml


# =========================================================================
# FINAL STAGE - Create the slim, runnable image
# =========================================================================
FROM nvidia/cuda:12.1.1-runtime-ubuntu22.04

WORKDIR /workspace

RUN apt-get update && apt-get install -y \
    python3.10 \
    python3.10-venv \
    supervisor \
    && rm -rf /var/lib/apt/lists/*

# Copy the compiled binary from the builder stage
COPY --from=builder /app/target/release/moshi-server /usr/local/bin/

# Copy the required Python virtual environments
COPY --from=builder /app/dockerless/.venv /workspace/dockerless/.venv
COPY --from=builder /app/backend_venv /workspace/backend_venv

# Copy your application code and configuration files
COPY . .

# Copy supervisor config
COPY supervisord.conf /etc/supervisor/conf.d/supervisord.conf

EXPOSE 8000
CMD ["/usr/bin/supervisord", "-c", "/etc/supervisor/conf.d/supervisord.conf"]
FROM runpod/pytorch:2.2.0-py3.10-cuda12.1.1-devel-ubuntu22.04
COPY . .
RUN curl -LsSf https://astral.sh/uv/install.sh | sh
RUN curl https://sh.rustup.rs -sSf | sh -s -- -y
RUN curl -fsSL https://get.pnpm.io/install.sh | sh -
RUN eval "$(cat ~/.bashrc | tail -n +10)"
RUN apt-get update
RUN apt-get install -y vim libssl-dev pkg-config cmake net-tools
RUN bash ./dockerless/install_stt.sh
RUN bash ./dockerless/install_tts.sh
EXPOSE 8000
CMD ["bash", "all_dockerless_noinstall.sh"]
FROM node:20-bookworm-slim

ARG FOUNDRY_VERSION=v1.7.1

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    git \
    curl \
    ca-certificates \
    python3 \
    python3-pip \
    && rm -rf /var/lib/apt/lists/*

# ===== Install Foundry =====
# Download pinned version from GitHub releases
RUN curl -fL --output /tmp/foundry.tar.gz \
    "https://github.com/foundry-rs/foundry/releases/download/${FOUNDRY_VERSION}/foundry_${FOUNDRY_VERSION}_linux_amd64.tar.gz" && \
    ls -la /tmp/foundry.tar.gz && \
    tar -xzf /tmp/foundry.tar.gz -C /usr/local/bin && \
    rm /tmp/foundry.tar.gz

# Verify Foundry installation
RUN forge --version

# ===== Install Slither =====
RUN pip3 install --no-cache-dir --break-system-packages slither-analyzer

# Verify Slither installation
RUN slither --version

# Verify Git
RUN git --version

WORKDIR /app
FROM node:20-bookworm-slim

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    git \
    curl \
    ca-certificates \
    python3 \
    python3-pip \
    && rm -rf /var/lib/apt/lists/*

# ===== Install Foundry =====
# Download binaries directly from GitHub releases (bypasses foundryup)
RUN curl -L --output /tmp/foundry.tar.gz \
    https://github.com/foundry-rs/foundry/releases/download/stable/foundry_nightly_linux_amd64.tar.gz && \
    tar -xzf /tmp/foundry.tar.gz -C /usr/local/bin && \
    rm /tmp/foundry.tar.gz

# Verify Foundry installation
RUN forge --version

# ===== Install Slither =====
RUN pip3 install --no-cache-dir slither-analyzer

# Verify Slither installation
RUN slither --version

# Verify Git
RUN git --version

WORKDIR /app
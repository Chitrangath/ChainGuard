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

# ===== Pre-download solc 0.8.20 =====
# Download the exact compiler binary so forge can use it offline via --use flag
RUN curl -fL -o /usr/local/lib/solc-0.8.20 \
    "https://github.com/ethereum/solidity/releases/download/v0.8.20/solc-static-linux" && \
    chmod +x /usr/local/lib/solc-0.8.20 && \
    /usr/local/lib/solc-0.8.20 --version

# ===== Install Slither =====
RUN pip3 install --no-cache-dir --break-system-packages slither-analyzer

# Pre-cache solc 0.8.20 for Slither's solc-select dependency
# solc-select stores artifacts at ~/.solc-select/artifacts/
# At runtime, HOME=/tmp so artifacts must be copied from here
# Make world-readable so non-root user can access
RUN solc-select install 0.8.20 && \
    solc-select use 0.8.20 && \
    solc --version && \
    chmod -R a+rX /root/.solc-select

# Verify Slither installation
RUN slither --version

# Verify Git
RUN git --version

WORKDIR /app
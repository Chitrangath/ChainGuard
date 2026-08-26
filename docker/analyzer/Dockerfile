FROM python:3.11-slim

# Install system dependencies: git, wget, ca-certificates
RUN apt-get update && apt-get install -y --no-install-recommends \
    git \
    wget \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# ===== Install Foundry =====
# Download the Foundry install script
RUN wget -q https://foundry.paradigm.xyz/install-foundry.sh -O /tmp/foundry-install.sh && \
    chmod +x /tmp/foundry-install.sh && \
    bash /tmp/foundry-install.sh -y 2>/dev/null && \
    rm /tmp/foundry-install.sh && \
    export PATH="/root/.foundry/bin:${PATH}" && \
    forge --version

# ===== Install Slither =====
# Install slither-analyzer via pip
RUN pip install --no-cache-dir slither-analyzer

# Verify Slither installation
RUN slither --version

# Verify Git is available
RUN git --version

WORKDIR /app
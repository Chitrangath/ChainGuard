# ChainGuard Analyzer Docker Image

## Overview

This Docker image provides the isolated execution environment for Solidity security analysis.

## Tools Included

- **Foundry** (forge) v1.7.1 - Solidity compilation and testing
- **Slither** v0.11.6 - Static security analysis
- **Git** v2.39.5 - Repository cloning
- **Python 3** - Required by Slither

## Build

```bash
docker build -t chainguard-analyzer:latest docker/analyzer/
```

## Verify

```bash
docker run --rm chainguard-analyzer:latest forge --version
docker run --rm chainguard-analyzer:latest slither --version
docker run --rm chainguard-analyzer:latest git --version
```

## Security Model

The analyzer container runs with restricted permissions:

- `--network none` - no network access
- `--read-only` - read-only root filesystem
- `--cap-drop=ALL` - no Linux capabilities
- `--security-opt=no-new-privileges` - no privilege escalation
- CPU and memory limits enforced at runtime

## Limitations

- No network access means dependencies must be vendored
- Only HTTPS GitHub repositories are supported for cloning (done on host)

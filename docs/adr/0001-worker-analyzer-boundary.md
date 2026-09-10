# ADR 0001: Keep orchestration on the worker and execute repository tooling in isolated containers

- Status: Accepted
- Date: 2026-09-10

## Context

ChainGuard must clone untrusted public repositories, run Solidity builds and tests, and parse Slither output. Running repository-defined tooling directly in the web process or host worker would combine untrusted execution with database, cache, and application credentials. Moving all orchestration into a container would still require a trusted component to claim jobs, enforce retries, persist evidence, and own cleanup.

## Decision

The Next.js process validates requests and enqueues analysis rows. A separate trusted worker atomically claims a row with a per-attempt database lease. The worker performs bounded Git and discovery operations on an attempt-specific host workspace but never executes repository build/test commands on the host. Forge, pinned solc, and Slither run in an ephemeral, network-disabled, non-root Docker container with a read-only root, dropped capabilities, resource limits, and no Docker socket mount.

All terminal persistence is conditional on the active lease. Stale recovery invalidates that lease before removing the matching attempt workspace/container. Analyzer output is bounded and treated as untrusted input; a score requires validated, complete evidence.

## Consequences

This creates a clear policy boundary and keeps database credentials out of analyzer containers. It supports deterministic cleanup and prevents stale retries from overwriting current evidence. The worker’s access to the Docker daemon is nevertheless privileged infrastructure authority, so deployments must isolate the worker and must not place that authority in the public web container. Host-side clone/discovery code remains security-sensitive and requires canonical path, entry, byte, output, and timeout bounds.

The MVP does not execute Hardhat/Truffle, download compilers at runtime, aggregate multiple roots, access private repositories, or deploy contracts.

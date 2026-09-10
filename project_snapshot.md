# Project Snapshot: ChainGuard

*Verified: 2026-09-10*
*Snapshot version: 7.0*

## Current state

ChainGuard is a local/internal Foundry-focused Solidity security-analysis MVP. P0 correctness, P1A analyzer-boundary hardening, P1B operational reliability, and Phase 7 documentation are implemented. It is not deployed and is not safe to expose as an unauthenticated public service.

The verified stack is Next.js 16.3.2, React 19.2.8, TypeScript, Prisma 7.9.1 with PostgreSQL, Redis, Vitest 4.1.11, Docker, Forge, pinned solc 0.8.20/0.8.24, and Slither. Local validation uses Node.js 20.20.2.

## Evidence contract

- Numeric risk score only when compilation PASS, Slither PASS with valid JSON, coverage FULL, and `evidenceVersion = 2`.
- All incomplete, failed, unsupported, no-contract, multi-root-partial, and legacy cases are null-score/BLOCKED.
- Only proven first-party findings affect the score. Dependency, generated, and unknown findings remain visible and unscored.
- Legacy rows are retained but API/UI suppress historic scores, PASS/test signals, finding counts, and findings; presentation says “Legacy analysis — rerun required.”
- History and findings use bounded server-side pagination and stable ordering. Redis caches compact validated terminal data for 300 seconds.

## Worker and analyzer boundary

- Queue claims use `FOR UPDATE SKIP LOCKED`; the database enforces one active analysis per project.
- Each attempt has an `executionToken`, unique workspace/container identity, conditional writes, deterministic retry policy, and stale-lease recovery.
- Clone/build workspaces are limited to 512 MiB and 50,000 entries. Discovery, compiler input, and child stdout/stderr are separately bounded.
- Canonical containment rejects source/import and submodule symlink escapes.
- Analyzer containers run without network, root privileges, capabilities, or writable root filesystem and retain CPU, memory, PID, tmpfs, timeout, and owned-cleanup limits.
- Forge and Slither receive the selected bundled compiler; Slither also receives `FOUNDRY_SOLC`. Runtime compiler downloads are disabled.

See `docs/architecture.md` and `docs/adr/0001-worker-analyzer-boundary.md` for diagrams and rationale.

## Verified real-runtime results

### Vulnerable fixture

- compilation PASS; compiler 0.8.20
- Forge tests PASS: 3/3
- Slither PASS; coverage FULL
- score 66; deployment BLOCKED
- first-party findings: 1 CRITICAL, 2 LOW
- dependency/generated/unknown findings: 0

### TerraLink

- one nested Foundry root selected; compiler 0.8.24
- discovery: 8 first-party, 364 dependency, 0 generated; 6 first-party sources targeted
- 20 deep dependency discovery rejections (`max_depth_exceeded`), without first-party coverage loss
- compilation PASS; 60 contracts compiled
- Forge tests PASS: 3/3
- Slither PASS; coverage FULL
- score 26; deployment BLOCKED
- first-party findings: 2 HIGH, 6 MEDIUM, 1 LOW
- dependency findings: 1 CRITICAL, 9 HIGH, 47 LOW
- generated/unknown findings: 0

### Failure and policy paths

- Missing/malformed Slither output: FAIL, no false zero-findings result, null score/BLOCKED through the risk gate.
- No-contract repository: `NO_CONTRACTS_FOUND`, coverage FAILED, null score/BLOCKED, exact gate reason `NO_CONTRACTS_FOUND`.
- Multiple roots: lexically first root selected; additional roots produce PARTIAL coverage, `additional_roots_not_analyzed`, null score/BLOCKED.
- Retryable: transient clone network failure, timeout/abort/spawn failure, analyzer unavailable; at most three attempts with 1s/2s backoff.
- Non-retryable: invalid input, unsupported compiler/toolchain, policy/submodule rejection, compile error, output/workspace limit.

## Database migrations

Six migrations are present. The latest is `20260910040000_add_analysis_execution_lease`, which adds nullable `executionToken` for attempt ownership. It was applied successfully to the local PostgreSQL database on 2026-09-10. No analysis records were deleted.

## Verification commands

```bash
npx prisma generate
npm test
npm run lint
npm run typecheck
npm run build -- --webpack
git diff --check
RUN_REAL_ANALYZER=1 npx vitest run worker/__tests__/real-analyzer.integration.test.ts
RUN_DB_INTEGRATION=1 npx vitest run src/lib/__tests__/analysis-queue.integration.test.ts
```

Safe E2E modes are `fixture`, `terralink`, and `no-contract` through `scripts/e2e-test.sh`. The harness creates only uniquely identified records and never kills unrelated processes, assumes obsolete container names, or deletes unrelated data.

## Remaining P1+/production gaps

- Hardhat/Truffle execution and multi-root aggregation are not implemented.
- Authentication, authorization, tenant isolation, private repository credentials, rate limiting, audit logs, monitoring, backups, and secret management are not implemented.
- Worker Docker-daemon authority requires dedicated infrastructure isolation before production use.
- Deployment automation is intentionally absent.

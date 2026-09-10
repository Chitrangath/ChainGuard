# ChainGuard

ChainGuard is a local, Foundry-focused Solidity security-analysis MVP. It clones a validated public GitHub repository, compiles and tests it with pinned Foundry/solc tooling, runs Slither in an isolated Docker container, and records scoped findings and deployment-gate evidence.

The risk score is automated triage. It is not a professional smart-contract audit and must not be treated as assurance that a contract is safe.

## Supported scope

- Foundry projects, including one deterministic nested Foundry root and validated GitHub HTTPS submodules.
- Pinned solc 0.8.20 and 0.8.24 when one compiler satisfies every selected first-party pragma and Foundry constraint.
- Standalone Solidity only when sources compile without package imports or repository-defined setup.
- First-party, dependency, and generated finding attribution. Only first-party findings affect the project score.

Hardhat and Truffle execution, runtime compiler downloads, private repositories, arbitrary setup scripts, multi-root aggregation, deployment, and hosted authentication are not supported.

If multiple Foundry roots exist, ChainGuard analyzes the lexically first root only, records `additional_roots_not_analyzed`, marks coverage `PARTIAL`, blocks deployment, and suppresses the score.

## Local requirements and setup

Install Node.js 20+, npm, Docker, PostgreSQL, and Redis. Then:

```bash
npm ci
docker compose up -d postgres redis
npx prisma migrate deploy
npx prisma generate
docker build -t chainguard-analyzer:latest -f docker/analyzer/Dockerfile .
```

Copy `.env.example` to `.env` and adjust connection ports before running migrations. The host processes use `DATABASE_URL` and `REDIS_URL`; `NEXT_PUBLIC_APP_URL` defaults to the local application URL. `WORKER_SECRET` is reserved for worker authentication in a later phase and does not currently protect the polling worker.

Run the app and worker in separate terminals:

```bash
npm run dev
npm run worker
```

`docker compose up -d postgres redis` starts only the durable dependencies used by host development. `docker compose up -d` additionally builds the production-style web container, but the analysis worker remains a separate host process because it owns analyzer-container creation. Do not expose this MVP directly to the public internet.

The worker atomically claims due jobs using `FOR UPDATE SKIP LOCKED`. One project may have only one queued/running analysis. A POST while one is active returns that analysis; a POST after completion deliberately creates a fresh analysis. Global active capacity is 25.

Transient clone-network failures, analyzer timeouts, process-spawn failures, and analyzer unavailability retry up to three total attempts with deterministic 1s/2s backoff. Unsafe input, unsupported compilers, invalid submodules, compilation errors, policy rejection, output-limit breaches, and workspace-limit breaches never retry. Every attempt receives a database lease token and unique workspace/container identity; stale attempts cannot overwrite or delete a newer attempt. APIs expose only bounded safe reason codes.

## Trust and evidence

A numeric score is available only when compilation and Slither pass with complete first-party coverage and current evidence. `PARTIAL` or `FAILED` coverage, missing output, unsupported tooling, no contracts, and legacy records remain unscored and blocked. Legacy history is retained but shown as “Legacy analysis — rerun required.”

Source discovery, compiler input, child-process output, and clone/build workspace growth are bounded. Analyzer containers use no network, a read-only root filesystem, dropped capabilities, `no-new-privileges`, CPU/memory/PID limits, and attempt-owned timeout cleanup. Canonical path checks reject source, import, and submodule symlink escapes. Untrusted repository code is never executed directly on the host.

Findings and analysis history are paginated with stable ordering. The UI states which finding page and total it displays; severity filters are applied server-side.

See [docs/architecture.md](docs/architecture.md) for trust boundaries, the analysis lifecycle, the evidence model, and deployment guidance. The worker/container boundary decision is recorded in [ADR 0001](docs/adr/0001-worker-analyzer-boundary.md).

## Verification

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

With PostgreSQL, Redis, app, worker, and the analyzer image already running, the safe E2E harness only creates its own project/analysis records and never stops unrelated processes or containers:

```bash
E2E_MODE=fixture E2E_TEST_REPO_URL=https://github.com/Chitrangath/ChainGuard bash scripts/e2e-test.sh
E2E_MODE=terralink E2E_TEST_REPO_URL=https://github.com/Chitrangath/TerraLink-RealEstate-Using-Blockchain bash scripts/e2e-test.sh
E2E_MODE=no-contract E2E_TEST_REPO_URL=https://github.com/octocat/Hello-World bash scripts/e2e-test.sh
```

Current verified reference results are: vulnerable fixture — compilation PASS, tests 3/3, Slither PASS, score 66, BLOCKED, one CRITICAL and two LOW first-party findings; TerraLink — nested Foundry root, solc 0.8.24, tests 3/3, Slither PASS, score 26 from first-party findings only.

## Operational checks and troubleshooting

- `docker compose ps` should report PostgreSQL and Redis healthy.
- `curl -fsS http://localhost:3000` verifies that the web process is reachable.
- A queued analysis requires a separately running `npm run worker`; the web process does not execute jobs.
- `docker image inspect chainguard-analyzer:latest` verifies that the local analyzer image exists. Rebuild it after changing `docker/analyzer/Dockerfile`.
- A null score is intentional whenever evidence is incomplete. Inspect `failureReason`, `gateReasons`, `coverage`, and `discoveryReasons`; never substitute zero or a previous score.
- `ANALYZER_UNAVAILABLE` and transient clone failures retry automatically. Deterministic failures remain terminal and require a corrected repository or a fresh analysis.
- The Vitest ESM/CommonJS message about `configLoader: 'native'` is a forward-looking Vite warning; it does not indicate a failed test.

The E2E script creates uniquely named project and analysis records. It does not delete unrelated database data, kill unrelated processes, or remove containers it does not own.

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

Run the app and worker in separate terminals:

```bash
npm run dev
npm run worker
```

The worker atomically claims due jobs using `FOR UPDATE SKIP LOCKED`. One project may have only one queued/running analysis. A POST while one is active returns that analysis; a POST after completion deliberately creates a fresh analysis. Global active capacity is 25.

Transient analyzer timeouts, process-spawn failures, and analyzer unavailability retry up to three total attempts with deterministic 1s/2s backoff. Unsafe input, unsupported compilers, invalid submodules, compilation errors, policy rejection, and output-limit breaches never retry. APIs expose only bounded safe reason codes.

## Trust and evidence

A numeric score is available only when compilation and Slither pass with complete first-party coverage and current evidence. `PARTIAL` or `FAILED` coverage, missing output, unsupported tooling, no contracts, and legacy records remain unscored and blocked. Legacy history is retained but shown as “Legacy analysis — rerun required.”

Source discovery and child-process output are bounded. Analyzer containers use no network, a read-only root filesystem, dropped capabilities, `no-new-privileges`, CPU/memory/PID limits, and owned timeout cleanup. Untrusted repository code is never executed directly on the host.

Findings and analysis history are paginated with stable ordering. The UI states which finding page and total it displays; severity filters are applied server-side.

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

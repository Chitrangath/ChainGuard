# Project Snapshot: ChainGuard

*Generated on: 2026-08-27*
*Snapshot Version: 4.0*

## 1. Context State & Goals

### Core Concept

ChainGuard is a full-stack Smart Contract DevSecOps platform. It allows a developer to provide a Solidity/Foundry project, run automated security analysis (Foundry compilation, Foundry tests, Slither static analysis), and receive a security risk score, deployment readiness decision, and historical analysis results.

### Current Status

Phase 5 COMPLETE — complete security analysis dashboard with paginated history, expandable findings, severity filtering, and automatic refresh after analysis completion. 98 tests pass, lint clean, typecheck clean, production build succeeds.

### Current Objective

Phase 5 is fully done. Next: Phase 6 (Infrastructure: Redis, CI, Docker Compose).

---

## 2. Technical Blueprint

### Tech Stack

- Frontend: Next.js 16.3.2, React 19.2.8, TypeScript 5.9.3, Tailwind CSS v4
- Backend: Next.js Route Handlers
- Database: PostgreSQL via Prisma v7.9.1 (`@prisma/adapter-pg` + `pg`)
- Cache: Redis (planned, not yet implemented)
- Blockchain: Foundry (forge v1.7.1 in Docker), Slither v0.11.6 (in Docker)
- Runtime: Node.js v24.19.0
- Containerization: Docker (chainguard-analyzer image built)
- Testing: Vitest 4.1.11
- Package Manager: npm 12.0.2

### Architecture

```
User -> Next.js UI -> POST /api/projects/[id]/analyze -> creates QUEUED analysis
                              |
Worker (polling every 3s) claims job via FOR UPDATE SKIP LOCKED
                              |
Worker runs analysis:
  1. git clone (validated HTTPS URL only)
  2. findFoundryProject() — searches for foundry.toml in subdirectories
  3. Docker container: forge build --use /usr/local/lib/solc-0.8.20
  4. Docker container: forge test --use /usr/local/lib/solc-0.8.20
  5. Docker container: slither with SVM/solc-select cache setup
  6. Parse Slither JSON -> findings
  7. Risk engine -> score + deployment gate
  8. Store results in PostgreSQL
                              |
Dashboard:
  Server queries: project identity, active analysis, bounded history (10 items)
  Client: AnalysisView orchestrates polling, selection, pagination
  Polling: GET /api/analyses/{id} (compact, no findings)
  Selection: ?analysisId= search param triggers server re-render
  Terminal state: router.refresh() re-fetches server data exactly once
```

### Repository Structure

```
chainguard/
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── projects/route.ts          (POST create, GET list)
│   │   │   ├── projects/[id]/route.ts     (GET detail)
│   │   │   ├── projects/[id]/analyze/route.ts  (POST start analysis)
│   │   │   ├── projects/[id]/analyses/route.ts (GET paginated history)
│   │   │   ├── projects/[id]/analyses/[analysisId]/route.ts (GET selected analysis + findings)
│   │   │   └── analyses/[id]/route.ts     (GET analysis status — compact)
│   │   ├── dashboard/page.tsx             (server: error states, active status)
│   │   ├── projects/[id]/page.tsx         (server: bounded queries, search param selection)
│   │   └── projects/new/page.tsx
│   ├── components/
│   │   ├── AnalysisControls.tsx   (rewritten: setTimeout polling, AbortController, retry, aria-live)
│   │   ├── AnalysisHistory.tsx    (NEW: paginated selectable history)
│   │   ├── AnalysisSummary.tsx    (NEW: risk + metrics + deployment gate + timestamps)
│   │   ├── AnalysisView.tsx       (NEW: orchestrator component)
│   │   ├── DeploymentGate.tsx
│   │   ├── FindingExplorer.tsx    (NEW: severity filter + expandable rows)
│   │   ├── FindingTable.tsx       (legacy, no longer imported)
│   │   ├── MetricsCard.tsx        (updated: severity accent borders)
│   │   ├── Navbar.tsx
│   │   ├── ProjectCard.tsx        (updated: last analysis date, active status)
│   │   └── RiskScore.tsx
│   ├── lib/
│   │   ├── api-error.ts
│   │   ├── db.ts                  (Prisma client singleton)
│   │   ├── validation.ts          (Zod schemas: pagination, analysis filter, finding filter)
│   │   ├── risk-engine.ts         (risk scoring: 100 - deductions)
│   │   └── analysis-parser.ts     (Slither JSON parser, handles numeric lines)
│   ├── __tests__/
│   │   └── api-analyses.test.ts   (NEW: pagination, filtering, sort, severity count tests)
│   └── generated/prisma/          (auto-generated Prisma client)
├── worker/
│   ├── index.ts                   (main loop: polling, job claiming)
│   ├── analyzer.ts                (Docker execution, SVM setup, outputDir fix)
│   ├── db.ts                      (worker Prisma client)
│   └── __tests__/
│       ├── analyzer.test.ts       (URL validation + parseTestOutput tests)
│       ├── analysis-parser.test.ts (Slither parser tests)
│       ├── state-transitions.test.ts
│       └── risk-engine.test.ts    (risk engine tests)
├── docker/
│   └── analyzer/
│       ├── Dockerfile             (forge v1.7.1 + solc 0.8.20 + slither v0.11.6)
│       └── README.md
├── scripts/
│   ├── setup-test-repo.sh         (init bare git repo for test-project)
│   └── e2e-test.sh                (production-path E2E test harness)
├── test-project/
│   ├── foundry.toml               (solc_version = "0.8.20", remappings for helpers/)
│   ├── src/Vault.sol              (reentrancy vulnerability fixture)
│   ├── test/
│   │   ├── Vault.t.sol            (Foundry test using local Test helper)
│   │   └── helpers/Test.sol       (minimal forge-std replacement)
│   └── README.md
├── prisma/schema.prisma
├── docs/Chain_guard_PRD_MVP.md
├── package.json
└── vitest.config.ts
```

### Architecture Rules

- Worker never executes untrusted code directly on host
- All repo URLs validated via regex: `^https:\/\/github\.com\/[a-zA-Z0-9._-]+\/[a-zA-Z0-9._-]+(?:\/.*)?$`
- Docker container flags: `--network none`, `--read-only`, `--cap-drop=ALL`, `--memory=2g`, `--cpus=2`, `--pids-limit=512`, `--security-opt=no-new-privileges`, `--user uid:gid`, `--tmpfs /tmp:rw,nosuid,nodev,exec,size=256m`, `--env HOME=/tmp`
- No `--privileged`, no `--network host`, no Docker socket mounts
- Worker uses atomic job claiming: `FOR UPDATE SKIP LOCKED`
- Prisma v7 requires driver adapter (`@prisma/adapter-pg` + `pg`)
- Zod v4 for validation
- 120s timeout for tool execution, 300s overall timeout
- `dockerRun()` accepts optional `outputDir` parameter — Slither invocation passes `wsDir/output` to fix path mismatch

---

## 3. Implemented vs In-Progress Features

### Completed (committed)

- Phase 1 (commit `6ec16d6`): Next.js skeleton, Prisma schema, pages, components, Tailwind, ESLint, TypeScript, production build
- Phase 2 (commit `770d522`): Project CRUD API, Dashboard, Project detail page, Create Project form, 17 tests
- Phase 3 (commit `bbf46eb`/`1cd7547`): POST analyze endpoint, GET analysis status, worker with atomic job claiming, 3s polling, stale job detection, AnalysisControls with polling, 28 tests total
- Phase 4 (commit `9e01e58`): Risk engine, Slither parser, Docker analyzer execution, test-project, 44 tests total
- Phase 4 Docker fix (commit `efa05c9`): Pinned Foundry v1.7.1, fixed pip install, verified image
- Phase 4 self-contained fixture (commit `aba8166`): Replaced forge-std with minimal local Test helper, test-project builds/tests without network
- Phase 4 E2E fix (commit `a4edb24`): Fixed dockerRun outputDir path mismatch, fixed Slither parser numeric lines, fixed forge test regex, added E2E test harness with process ownership
- Phase 5 (commit pending): Complete security analysis dashboard — paginated history, expandable findings, severity filtering, automatic refresh, 98 tests

### In Progress (NOT committed)

Phase 5 — ready to commit.

### Planned (next steps)

- Phase 6: Redis caching, Docker Compose, CI pipeline
- Phase 7: README, architecture diagram, production deployment

### Known Technical Debt / Bugs

- Redis not implemented (PRD says "after core functionality works")
- No Docker Compose yet for easy local dev
- No CI pipeline yet
- FindingTable.tsx is legacy (no longer imported), can be removed

### Important Decisions

- Docker base image: `node:20-bookworm-slim` (has bash, apt, Node.js)
- Foundry in Docker: Download tarballs from GitHub releases pinned to v1.7.1
- Slither in Docker: pip install with `--break-system-packages` on Debian bookworm
- solc 0.8.20: Pre-downloaded to `/usr/local/lib/solc-0.8.20` in Docker image; forge uses `--use` flag to bypass SVM
- Slither solc-select: Pre-cached in Docker image at `/root/.solc-select/`; at runtime copied to `$HOME/.solc-select/` and SVM populated at `$HOME/.svm/0.8.20/`
- Risk engine: Start at 100, CRITICAL=-30, HIGH=-15, MEDIUM=-7, LOW=-2, compilation FAIL=-20, test FAIL=-10
- Deployment gate: READY if score>=80 AND 0 criticals AND compile=PASS AND tests=PASS
- forge-std replaced with minimal local Test helper to keep test-project self-contained (no network, no `forge install`)
- test-project/foundry.toml has `remappings = ["helpers/=test/helpers/"]` for the local Test helper
- Phase 5: Analysis selection uses `?analysisId=` search param — server re-renders with selected analysis findings
- Phase 5: Polling uses recursive setTimeout with AbortController (no overlapping requests)
- Phase 5: Terminal state triggers exactly one `router.refresh()` via Next.js 16 `useRouter()` from `next/navigation`
- Phase 5: History is bounded (10 items per page, max pageSize 25) via Zod-validated pagination
- Phase 5: Findings sorted by severity (CRITICAL→LOW), then file ASC, line ASC, id ASC
- Phase 5: Analysis numbering uses shortened ID (not sequential #N) to avoid inaccurate counts across pagination

---

## 4. Key Implementation Details

### Prisma Schema Enums

```prisma
enum AnalysisStatus { QUEUED RUNNING COMPLETED FAILED }
enum DeploymentStatus { READY BLOCKED }
enum CompilationStatus { PASS FAIL }
enum TestStatus { PASS FAIL }
enum Severity { CRITICAL HIGH MEDIUM LOW }
```

### Risk Engine

```typescript
export function calculateRisk(input: RiskInput): RiskResult {
  // input: { severityCounts, compilationStatus, testStatus }
  // result: { riskScore, deploymentStatus, criticalFindings }
  // score = 100 - 30*CRITICAL - 15*HIGH - 7*MEDIUM - 2*LOW - 20*compFail - 10*testFail
  // READY iff score>=80 AND 0 criticals AND compile=PASS AND tests=PASS
}
```

### Slither Parser

```typescript
export function parseSlitherOutput(rawJson: string): ParsedFinding[] {
  // ParsedFinding: { severity, type, contract, file, line, description, source }
  // Handles both numeric lines[] (real Slither output) and string lines[] (legacy)
}
```

### Test Output Parser

```typescript
export function parseTestOutput(testOutput: string): {
  passedTests: number | null;
  failedTests: number | null;
  totalTests: number | null;
};
// Matches: "3 passed", "3 tests passed", "1 failed", "1 test failed"
```

### Docker Analyzer

```
docker run --rm --network none --read-only --cap-drop=ALL \
  --security-opt=no-new-privileges --memory=2g --cpus=2 --pids-limit=512 \
  --user uid:gid --workdir /project \
  --tmpfs /tmp:rw,nosuid,nodev,exec,size=256m --env HOME=/tmp \
  -v <foundryDir>:/project \
  -v <outputDir>:/tmp/output:rw \
  chainguard-analyzer:latest <command>
```

### Slither Invocation (inside container)

```sh
mkdir -p "$HOME/.svm/0.8.20" && \
cp /usr/local/lib/solc-0.8.20 "$HOME/.svm/0.8.20/solc-0.8.20" && \
chmod +x "$HOME/.svm/0.8.20/solc-0.8.20" && \
cp -r /root/.solc-select "$HOME/.solc-select" 2>/dev/null || true && \
slither . --json /tmp/output/slither.json --fail-high
```

### E2E Test Results (verified)

```
compilationStatus: PASS
testStatus:        PASS
riskScore:         66
deploymentStatus:  BLOCKED
findingCount:      3
  CRITICAL | reentrancy-eth  | src/Vault.sol | 11
  LOW      | solc-version    | src/Vault.sol | 2
  LOW      | low-level-calls | src/Vault.sol | 11
totalTests: 3, passedTests: 3, failedTests: 0
```

---

## 5. Environment & Configuration

### Required Environment

- Node.js v24.19.0
- npm 12.0.2
- PostgreSQL (running on localhost:5432, container name: guardrails-postgres)
- Docker (for building and running analyzer image)
- Git

### Environment Variables

```
DATABASE_URL="postgresql://guardrails:guardrails_dev@localhost:5432/guardrails?schema=public"
REDIS_URL="redis://localhost:6379"
WORKER_SECRET="change-me-in-production"
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

### Commands

```bash
# Install
npm install
npx prisma generate

# Development
npm run dev          # Next.js dev server
npm run worker       # Start worker (tsx worker/index.ts)

# Test
npm test             # vitest run (98 tests)
npm run lint         # eslint
npm run typecheck    # tsc --noEmit
npm run build        # next build (production)

# Docker
docker build -t chainguard-analyzer -f docker/analyzer/Dockerfile .

# E2E Test (production path)
E2E_TEST_REPO_URL="https://github.com/Chitrangath/ChainGuard" bash scripts/e2e-test.sh
```

---

## 6. Precise Next Steps

1. **Phase 6** — Redis caching, Docker Compose, CI pipeline
2. **Phase 7** — README, architecture diagram, production deployment

---

## 7. Handoff Notes

- **DO NOT modify** `src/lib/db.ts`, `worker/db.ts`, `prisma/schema.prisma`, or Prisma-generated files unless required
- **DO NOT modify** `worker/index.ts` job claiming logic (`FOR UPDATE SKIP LOCKED`) — it works
- `docker/analyzer/Dockerfile` is WORKING — verified with forge v1.7.1, slither v0.11.6, solc 0.8.20
- `worker/analyzer.ts` handles the full pipeline: git clone, Docker execution, parsing, risk calculation, DB persistence
- `dockerRun()` outputDir fix is critical — Slither invocation MUST pass `outputDir` (wsDir/output) separately from `workspaceDir` (foundryDir) to avoid path mismatch
- `test-project/` is self-contained with minimal forge-std replacement at `test/helpers/Test.sol` — do NOT add forge-std dependency
- `test-project/foundry.toml` has `remappings = ["helpers/=test/helpers/"]` — do NOT modify
- `test-project/src/Vault.sol` has a reentrancy vulnerability — do NOT modify
- The `--tmpfs /tmp:rw,nosuid,nodev,exec,size=256m` flag is required — Docker auto-adds `noexec` which prevents binary execution
- Slither parser handles both numeric `lines[]` (actual Slither output) and string `lines[]` (legacy format)
- E2E harness uses global variables (not command substitution) for function return values to avoid stdout contamination from `log` calls
- Phase 5: `AnalysisView` is the main client orchestrator — passes `activeAnalysis` as `{...raw, createdAt: raw.createdAt.toISOString()}` to avoid Date/string type mismatch
- Phase 5: `FindingExplorer` sort uses `<`/`>` comparison (not `localeCompare`) for stable id ordering
- Phase 5: `AnalysisControls` polling uses recursive `setTimeout` (not `setInterval`) to prevent overlapping requests
- Phase 5: Terminal state triggers `router.refresh()` exactly once via `refreshCalledRef` guard
- Phase 5: Polling failure shows "Polling interrupted" + Retry button after 3 consecutive failures
- Phase 5: `AnalysisHistory` fetches pages via client-side API calls, not server re-renders
- Git commits: `6ec16d6` -> `770d522` -> `bbf46eb` -> `1cd7547` -> `9e01e58` -> `efa05c9` -> `aba8166` -> `a4edb24` (all on master)

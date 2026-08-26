# Project Snapshot: ChainGuard

*Generated on: 2026-08-26*
*Snapshot Version: 2.0*

## 1. Context State & Goals

### Core Concept

ChainGuard is a full-stack Smart Contract DevSecOps platform. It allows a developer to provide a Solidity/Foundry project, run automated security analysis (Foundry compilation, Foundry tests, Slither static analysis), and receive a security risk score, deployment readiness decision, and historical analysis results.

### Current Status

MVP — Phases 1-3 committed. Phase 4 (real security engine) implemented and committed. Docker analyzer image built and verified.

### Current Objective

Phase 4 is complete. Next: End-to-end integration test using the vulnerable test-project, then proceed to Phase 5 (Dashboard polish) or Phase 6 (Infrastructure: Redis, CI).

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
  2. Docker container: forge build, forge test, slither
  3. Parse Slither JSON -> findings
  4. Risk engine -> score + deployment gate
  5. Store results in PostgreSQL
                              |
Frontend polls GET /api/analyses/[id] -> displays results
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
│   │   │   └── analyses/[id]/route.ts     (GET analysis status)
│   │   ├── dashboard/page.tsx
│   │   ├── projects/[id]/page.tsx
│   │   └── projects/new/page.tsx
│   ├── components/
│   │   ├── AnalysisControls.tsx   (Run Analysis button + polling)
│   │   ├── DeploymentGate.tsx
│   │   ├── FindingTable.tsx
│   │   ├── MetricsCard.tsx
│   │   ├── Navbar.tsx
│   │   ├── ProjectCard.tsx
│   │   └── RiskScore.tsx
│   ├── lib/
│   │   ├── api-error.ts
│   │   ├── db.ts                  (Prisma client singleton)
│   │   ├── validation.ts          (Zod schemas)
│   │   ├── risk-engine.ts         (NEW: PRD scoring model)
│   │   └── analysis-parser.ts     (NEW: Slither JSON parser)
│   └── generated/prisma/          (auto-generated Prisma client)
├── worker/
│   ├── index.ts                   (main loop: polling, job claiming)
│   ├── analyzer.ts                (REWRITTEN: real Docker execution)
│   ├── db.ts                      (worker Prisma client)
│   └── __tests__/
│       ├── analyzer.test.ts       (UPDATED: URL validation tests)
│       ├── state-transitions.test.ts
│       └── risk-engine.test.ts    (NEW: 14 risk engine tests)
├── docker/
│   └── analyzer/
│       ├── Dockerfile             (REWRITTEN: node:20-bookworm-slim + forge v1.7.1 + slither v0.11.6)
│       └── README.md              (NEW: image documentation)
├── scripts/
│   └── setup-test-repo.sh         (NEW: init bare git repo for test-project)
├── test-project/
│   ├── foundry.toml               (NEW)
│   ├── src/Vault.sol              (reentrancy vulnerability)
│   ├── test/Vault.t.sol           (REWRITTEN: proper Foundry test)
│   └── README.md                  (NEW: vulnerability warning)
├── prisma/schema.prisma
├── docs/Chain_guard_PRD_MVP.md
├── package.json
└── vitest.config.ts
```

### Architecture Rules

- Worker never executes untrusted code directly on host
- All repo URLs validated via Zod regex: `^https:\/\/github\.com\/[a-zA-Z0-9._-]+\/[a-zA-Z0-9._-]+(?:\/.*)?$`
- Docker container flags: `--network none`, `--read-only`, `--cap-drop=ALL`, `--memory=2g`, `--cpus=2`, `--pids-limit=512`, `--security-opt=no-new-privileges`
- No `--privileged`, no `--network host`, no Docker socket mounts
- Worker uses atomic job claiming: `FOR UPDATE SKIP LOCKED`
- Prisma v7 requires driver adapter (`@prisma/adapter-pg` + `pg`)
- Zod v4 for validation
- 120s timeout for tool execution, 300s overall timeout
- Infrastructure failure vs valid analysis result distinction required

---

## 3. Implemented vs In-Progress Features

### Completed (committed)

- Phase 1 (commit `6ec16d6`): Next.js skeleton, Prisma schema, pages, components, Tailwind, ESLint, TypeScript, production build
- Phase 2 (commit `770d522`): Project CRUD API, Dashboard, Project detail page, Create Project form, 17 tests
- Phase 3 (commit `bbf46eb`/`1cd7547`): POST analyze endpoint, GET analysis status, worker with atomic job claiming, 3s polling, stale job detection, AnalysisControls with polling, 28 tests total
- Phase 4 (commit `9e01e58`): Risk engine, Slither parser, Docker analyzer execution, test-project, 44 tests total
- Phase 4 Docker fix (commit `efa05c9`): Pinned Foundry v1.7.1, fixed pip install, verified image

### In Progress (NOT committed)

None — all Phase 4 work is committed.

### Planned (next steps)

- End-to-end integration test with test-project (requires PostgreSQL running)
- Phase 5: Dashboard polish, analysis history improvements
- Phase 6: Redis caching, Docker Compose, CI pipeline
- Phase 7: README, architecture diagram, production deployment

### Known Technical Debt / Bugs

- End-to-end test not yet performed (requires PostgreSQL + Docker together)
- Redis not implemented (PRD says "after core functionality works")
- No Docker Compose yet for easy local dev
- No CI pipeline yet

### Important Decisions

- Docker base image: `node:20-bookworm-slim` (has bash, apt, Node.js)
- Foundry in Docker: Download tarballs from GitHub releases pinned to v1.7.1
- Slither in Docker: pip install with `--break-system-packages` on Debian bookworm
- Test repo URL: Local bare git repo (worker clones from local path)
- Risk engine: Start at 100, CRITICAL=-30, HIGH=-15, MEDIUM=-7, LOW=-2, compilation FAIL=-20, test FAIL=-10
- Deployment gate: READY if score>=80 AND 0 criticals AND compile=PASS AND tests=PASS

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

### Risk Engine Signature

```typescript
export function calculateRisk(input: RiskInput): RiskResult {
  // input: { severityCounts, compilationStatus, testStatus }
  // result: { riskScore, deploymentStatus, criticalFindings }
}
```

### Slither Parser Signature

```typescript
export function parseSlitherOutput(rawJson: string): ParsedFinding[] {
  // ParsedFinding: { severity, type, contract, file, line, description, source }
}
```

### Docker Analyzer Command

```
docker run --rm --network none --read-only --cap-drop=ALL \
  --security-opt=no-new-privileges --memory=2g --cpus=2 --pids-limit=512 \
  -v <workspace>:/project:ro -v <workspace>/output:/tmp/output:rw \
  chainguard-analyzer:latest <command>
```

### Foundry Binary Download URL

```
https://github.com/foundry-rs/foundry/releases/download/v1.7.1/foundry_v1.7.1_linux_amd64.tar.gz
```

---

## 5. Environment & Configuration

### Required Environment

- Node.js v24.19.0
- npm 12.0.2
- PostgreSQL (running on localhost:5432)
- Docker (for building and running analyzer image)
- Git 2.43.0

### Environment Variables

```
DATABASE_URL=postgresql://user:password@localhost:5432/chainguard?schema=public
REDIS_URL=redis://localhost:6379
WORKER_SECRET=change-me-in-production
NEXT_PUBLIC_APP_URL=http://localhost:3000
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
npm run test         # vitest run (44 tests)
npm run lint         # eslint
npm run typecheck    # tsc --noEmit
npm run build        # next build (production)

# Docker
docker build -t chainguard-analyzer -f docker/analyzer/Dockerfile .
docker run --rm chainguard-analyzer forge --version
docker run --rm chainguard-analyzer slither --version
docker run --rm chainguard-analyzer git --version

# Test repo setup
bash scripts/setup-test-repo.sh
```

---

## 6. Precise Next Steps

1. **Perform end-to-end integration test** — Set up PostgreSQL, run worker, create project with test-project URL, verify findings persist and dashboard displays results
2. **Commit snapshot update** — Stage project_snapshot.md
3. **Decide next phase** — Phase 5 (Dashboard polish) or Phase 6 (Redis, Docker Compose, CI)

---

## 7. Handoff Notes

- **DO NOT modify** `src/lib/db.ts`, `worker/db.ts`, `prisma/schema.prisma`, or Prisma-generated files unless required
- **DO NOT modify** `worker/index.ts` job claiming logic (`FOR UPDATE SKIP LOCKED`) — it works
- **DO NOT modify** `src/components/AnalysisControls.tsx` polling logic — it works
- `docker/analyzer/Dockerfile` is WORKING — verified with forge v1.7.1, slither v0.11.6, git v2.39.5
- `worker/analyzer.ts` handles the full pipeline: git clone, Docker execution, parsing, risk calculation, DB persistence
- The analyzer handles both infrastructure failures (returns `success: false`) and analysis results (compilation/test failures are results, not failures)
- Phase 3 is committed and working — all 44 tests must continue to pass
- Git commits: `6ec16d6` -> `770d522` -> `bbf46eb` -> `1cd7547` -> `9e01e58` -> `efa05c9` (all on main branch)
- The `test-project/src/Vault.sol` reentrancy vulnerability is correct — do NOT modify
- The `test-project/test/Vault.t.sol` is a proper Foundry test — do NOT modify

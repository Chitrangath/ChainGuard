# Project Snapshot: ChainGuard

*Generated on: 2026-08-26*
*Snapshot Version: 1.0*

## 1. Context State & Goals

### Core Concept

ChainGuard is a full-stack Smart Contract DevSecOps platform. It allows a developer to provide a Solidity/Foundry project, run automated security analysis (Foundry compilation, Foundry tests, Slither static analysis), and receive a security risk score, deployment readiness decision, and historical analysis results.

### Current Status

MVP — Phases 1-3 committed. Phase 4 (real security engine) is planned but NOT implemented.

### Current Objective

Complete Phase 4: Implement real Docker-based security analysis engine with Slither, Foundry execution inside container, Slither JSON parser, risk scoring engine, and deployment gate.

---

## 2. Technical Blueprint

### Tech Stack

- Frontend: Next.js 16.3.2, React 19.2.8, TypeScript 5.9.3, Tailwind CSS v4
- Backend: Next.js Route Handlers
- Database: PostgreSQL via Prisma v7.9.1 (`@prisma/adapter-pg` + `pg`)
- Cache: Redis (planned, not yet implemented)
- Blockchain: Foundry (forge 1.5.1 on host), Slither (to be installed in Docker)
- Runtime: Node.js v24.19.0
- Containerization: Docker (Dockerfile exists but broken)
- Testing: Vitest 4.1.11
- Package Manager: npm 12.0.2

### Architecture

```
User → Next.js UI → POST /api/projects/[id]/analyze → creates QUEUED analysis
                              ↓
Worker (polling every 3s) claims job via FOR UPDATE SKIP LOCKED
                              ↓
Worker runs analysis:
  1. git clone (validated HTTPS URL only)
  2. Docker container: forge build, forge test, slither
  3. Parse Slither JSON → findings
  4. Risk engine → score + deployment gate
  5. Store results in PostgreSQL
                              ↓
Frontend polls GET /api/analyses/[id] → displays results
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
│   │   └── validation.ts          (Zod schemas)
│   └── generated/prisma/          (auto-generated Prisma client)
├── worker/
│   ├── index.ts                   (main loop: polling, job claiming)
│   ├── analyzer.ts                (PLACEHOLDER - returns { success: true })
│   ├── db.ts                      (worker Prisma client)
│   └── __tests__/
│       ├── analyzer.test.ts
│       └── state-transitions.test.ts
├── docker/analyzer/Dockerfile     (BROKEN - Foundry install fails)
├── test-project/                  (INCOMPLETE - needs fixes)
│   ├── src/Vault.sol              (reentrancy vulnerability - OK)
│   └── test/Vault.t.sol          (MALFORMED - missing contract wrapper)
├── prisma/schema.prisma
├── docs/Chain_guard_PRD_MVP.md
├── package.json
└── vitest.config.ts
```

### Architecture Rules

- Worker never executes untrusted code directly on host
- All repo URLs validated via Zod regex: `^https:\/\/github\.com\/[a-zA-Z0-9._-]+\/[a-zA-Z0-9._-]+(?:\/.*)?$`
- Docker container flags: `--network none`, `--read-only`, `--cap-drop=ALL`, `--memory`, `--cpus`, `--pids-limit`, `--security-opt=no-new-privileges`
- No `--privileged`, no `--network host`, no Docker socket mounts
- Worker uses atomic job claiming: `FOR UPDATE SKIP LOCKED`
- Prisma v7 requires driver adapter (`@prisma/adapter-pg` + `pg`)
- Zod v4 for validation
- 120s timeout for analysis execution
- Infrastructure failure vs valid analysis result distinction required

---

## 3. Implemented vs In-Progress Features

### Completed (committed)

- Phase 1 (commit `6ec16d6`): Next.js skeleton, Prisma schema, pages, components, Tailwind, ESLint, TypeScript, production build
- Phase 2 (commit `770d522`): Project CRUD API, Dashboard, Project detail page, Create Project form, 17 tests
- Phase 3 (commit `bbf46eb`/`1cd7547`): POST analyze endpoint, GET analysis status, worker with atomic job claiming, 3s polling, stale job detection, AnalysisControls with polling, 28 tests total

### In Progress (NOT committed)

- Phase 4: Only placeholder files exist. No real analysis logic.
  - `worker/analyzer.ts` is a stub returning `{ success: true }`
  - `docker/analyzer/Dockerfile` exists but Foundry install fails (exit code 127)
  - `test-project/src/Vault.sol` has correct reentrancy vulnerability
  - `test-project/test/Vault.t.sol` is MALFORMED

### Planned (Phase 4 remaining)

- Fix `docker/analyzer/Dockerfile` — use `node:20-bookworm-slim`, download Foundry binaries from GitHub releases, install slither via pip
- Create `src/lib/risk-engine.ts` — risk score calculation (100 base, deductions per severity)
- Create `src/lib/analysis-parser.ts` — Slither JSON parser, severity mapping
- Rewrite `worker/analyzer.ts` — real Docker execution pipeline
- Create `worker/__tests__/risk-engine.test.ts` — 10+ tests per PRD spec
- Fix `test-project/test/Vault.t.sol` — proper Foundry test with contract wrapper
- Create `test-project/foundry.toml` and `test-project/README.md`
- Update `src/app/projects/[id]/page.tsx` — remove "Phase 4" placeholder text
- Create `scripts/setup-test-repo.sh` — init bare git repo for local test-project cloning

### Known Technical Debt / Bugs

- `test-project/test/Vault.t.sol` is malformed — needs complete rewrite
- `docker/analyzer/Dockerfile` fails to install Foundry — needs complete rewrite
- `worker/analyzer.ts` is a placeholder — needs real implementation
- No risk engine exists yet
- No Slither parser exists yet
- `src/app/projects/[id]/page.tsx` has "Phase 4" placeholder text

### Important Decisions

- Docker base image: `node:20-bookworm-slim`
- Foundry in Docker: Download tarballs from GitHub releases (bypasses broken `foundryup`)
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

### Worker Job Claiming (atomic)

```typescript
const rows = await tx.$queryRawUnsafe<{ id: string; projectId: string }[]>(
  `SELECT id, "projectId" FROM analyses
   WHERE status = 'QUEUED'
   ORDER BY "createdAt" ASC
   LIMIT 1
   FOR UPDATE SKIP LOCKED`,
);
```

### AnalysisControls Polling

- Polls every 2000ms via `setInterval`
- Stops on terminal status (COMPLETED or FAILED)
- Uses `mountedRef` for cleanup

### Foundry Binary Download URL (for Dockerfile)

```
https://github.com/foundry-rs/foundry/releases/download/stable/foundry_nightly_linux_amd64.tar.gz
```

---

## 5. Environment & Configuration

### Required Environment

- Node.js v24.19.0
- npm 12.0.2
- PostgreSQL (running on localhost:5432)
- Docker (for building analyzer image)
- Foundry forge 1.5.1 (on host)
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
npm run test         # vitest run
npm run lint         # eslint
npm run typecheck    # tsc --noEmit
npm run build        # next build (production)

# Docker
docker build -t chainguard-analyzer:latest docker/analyzer/
```

---

## 6. Precise Next Steps

1. **Fix `test-project/test/Vault.t.sol`** — Add proper Foundry test wrapper
2. **Create `test-project/foundry.toml`** — Basic Foundry config
3. **Create `src/lib/risk-engine.ts`** — Risk score + deployment gate
4. **Create `src/lib/analysis-parser.ts`** — Slither JSON parser + severity mapping
5. **Create `worker/__tests__/risk-engine.test.ts`** — Unit tests
6. **Rewrite `docker/analyzer/Dockerfile`** — node:20-bookworm-slim, GitHub tarballs, slither via pip
7. **Rewrite `worker/analyzer.ts`** — Real Docker execution
8. **Update `worker/index.ts`** — Wire in real analyzer, workspace cleanup
9. **Update `src/app/projects/[id]/page.tsx`** — Remove placeholder text
10. **Run verification** — lint, typecheck, test, build
11. **Git commit** — `feat: implement analysis engine with Docker, risk scoring, and Slither integration`

---

## 7. Handoff Notes

- **DO NOT modify** `src/lib/db.ts`, `worker/db.ts`, `prisma/schema.prisma`, or Prisma-generated files unless required
- **DO NOT modify** `worker/index.ts` job claiming logic (`FOR UPDATE SKIP LOCKED`) — it works
- **DO NOT modify** `src/components/AnalysisControls.tsx` polling logic — it works
- `test-project/test/Vault.t.sol` is MALFORMED — must be completely rewritten
- `docker/analyzer/Dockerfile` is completely broken — rewrite from scratch
- The `foundryup` install script does NOT work in Docker — use direct GitHub binary downloads
- Docker is NOT available in the current WSL 2 environment — Dockerfile should be correct but cannot be built locally
- `test-project/src/Vault.sol` reentrancy vulnerability is correct — do NOT modify
- Phase 3 is committed and working — all 28 existing tests must continue to pass
- Git commits: `6ec16d6` → `770d522` → `bbf46eb` → `1cd7547` (all on main branch)

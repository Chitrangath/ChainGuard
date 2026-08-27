# Project Snapshot: ChainGuard

*Generated on: 2026-08-27*
*Snapshot Version: 6.0*

## 1. Context State & Goals

### Core Concept

ChainGuard is a full-stack Smart Contract DevSecOps platform. It allows a developer to provide a Solidity/Foundry project, run automated security analysis (Foundry compilation, Foundry tests, Slither static analysis), and receive a security risk score, deployment readiness decision, and historical analysis results.

### Current Status

Phase 6.5 COMPLETE — Production-grade UI/UX polish with verified design system, professional iconography, accessible components, responsive layouts, and visual verification at desktop (1440×900), tablet (768×1024), and mobile (390×844). 123 tests pass, lint clean, typecheck clean, production build succeeds.

### Current Objective

Phase 6.5 is fully done. Next: Phase 7 (README, architecture diagram, production deployment).

---

## 2. Technical Blueprint

### Tech Stack

- Frontend: Next.js 16.3.2, React 19.2.8, TypeScript 5.9.3, Tailwind CSS v4
- Backend: Next.js Route Handlers
- Database: PostgreSQL via Prisma v7.9.1 (`@prisma/adapter-pg` + `pg`)
- Cache: Redis via `redis` v6.2.1 (optional, 300s TTL)
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

### Design System

Phase 6.5 established a consistent design system using CSS custom properties in `globals.css`:

**Surfaces:**
- `--background`: Page background (light: #f8fafc, dark: #0c0f14)
- `--surface-primary`: Card backgrounds
- `--surface-secondary`: Secondary surfaces, expanded finding details
- `--surface-elevated`: Elevated cards with shadow
- `--surface-nav`: Navigation bar

**Borders:**
- `--border-default`: Standard borders
- `--border-emphasized`: Stronger borders
- `--border-focus`: Focus ring color (blue)

**Text:**
- `--text-primary`: Headings, primary content
- `--text-secondary`: Descriptions, secondary info
- `--text-muted`: Timestamps, labels, metadata

**Status Colors (Security):**
- `--color-critical`: Red for CRITICAL findings, FAILED, BLOCKED
- `--color-high`: Orange for HIGH findings
- `--color-medium`: Yellow/amber for MEDIUM findings, QUEUED
- `--color-low`: Blue for LOW findings, RUNNING

**Status Colors (Operational):**
- `--color-ready`: Green for READY, PASS, COMPLETED
- `--color-blocked`: Red for BLOCKED, FAILED
- `--color-queued`: Yellow for QUEUED
- `--color-running`: Blue for RUNNING

**Shared Components:**
- `surface-card`, `surface-elevated`: Card surface patterns
- `btn`, `btn-primary`, `btn-secondary`, `btn-ghost`, `btn-danger`: Button variants
- `badge`, `badge-critical/high/medium/low/ready/blocked/queued/running`: Status badges
- `input`, `input-label`, `input-description`, `input-error`: Form controls
- `focus-ring`: Accessible focus indicator
- `animate-pulse-subtle`: Subtle loading animation

**Icons (src/components/icons.tsx):**
- ShieldIcon, ChevronIcon, ExternalLinkIcon, CheckIcon, XIcon, AlertIcon, SearchIcon, ArrowLeftIcon, PlusIcon, HistoryIcon

**Reusable Components:**
- `StatusBadge`: Status display (QUEUED/RUNNING/COMPLETED/FAILED/READY/BLOCKED/PASS/FAIL)
- `SeverityBadge`: Severity display with optional count (CRITICAL/HIGH/MEDIUM/LOW)
- `DeploymentBadge`: Deployment status display (READY/BLOCKED)

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
│   │   ├── dashboard/page.tsx             (server: summary metrics, project grid)
│   │   ├── projects/[id]/page.tsx         (server: bounded queries, search param selection)
│   │   └── projects/new/page.tsx          (client: form with validation)
│   ├── components/
│   │   ├── AnalysisControls.tsx   (client: polling, retry, status badge)
│   │   ├── AnalysisHistory.tsx    (client: paginated selectable history)
│   │   ├── AnalysisSummary.tsx    (server: risk + metrics + deployment gate + timestamps)
│   │   ├── AnalysisView.tsx       (client: orchestrator component)
│   │   ├── Badge.tsx              (NEW: StatusBadge, SeverityBadge, DeploymentBadge)
│   │   ├── DeploymentGate.tsx     (server: deployment status display)
│   │   ├── FindingExplorer.tsx    (client: severity filter + expandable rows)
│   │   ├── MetricsCard.tsx        (server: metric display with accent borders)
│   │   ├── Navbar.tsx             (client: shield icon, active states)
│   │   ├── ProjectCard.tsx        (server: project summary card)
│   │   ├── RiskScore.tsx          (server: risk score display with color coding)
│   │   └── icons.tsx              (NEW: SVG icon library)
│   ├── lib/
│   │   ├── analysis-cache.ts      (cache abstraction)
│   │   ├── analysis-service.ts    (cache-aside pattern)
│   │   ├── analysis-utils.ts      (shared types and utilities)
│   │   ├── api-error.ts
│   │   ├── db.ts                  (Prisma client singleton)
│   │   ├── redis.ts               (Redis client)
│   │   ├── risk-engine.ts         (risk scoring)
│   │   ├── analysis-parser.ts     (Slither parser)
│   │   └── validation.ts          (Zod schemas)
│   ├── __tests__/
│   │   ├── api-analyses.test.ts
│   │   └── api-error.test.ts
│   └── generated/prisma/          (auto-generated Prisma client)
├── worker/
│   ├── index.ts                   (main loop: polling, job claiming)
│   ├── analyzer.ts                (Docker execution)
│   ├── db.ts                      (worker Prisma client)
│   └── __tests__/
│       ├── analyzer.test.ts
│       ├── analysis-parser.test.ts
│       ├── state-transitions.test.ts
│       └── risk-engine.test.ts
├── docker/
│   └── analyzer/
│       └── Dockerfile             (forge + slither + solc)
├── scripts/
│   ├── setup-test-repo.sh
│   └── e2e-test.sh
├── test-project/
│   ├── foundry.toml
│   ├── src/Vault.sol
│   └── test/
├── prisma/schema.prisma
├── docker-compose.yml
├── .github/workflows/ci.yml
├── .dockerignore
├── .env.example
├── Dockerfile
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
- `dockerRun()` accepts optional `outputDir` parameter

---

## 3. Implemented vs In-Progress Features

### Completed (committed)

- Phase 1 (commit `6ec16d6`): Next.js skeleton, Prisma schema, pages, components, Tailwind
- Phase 2 (commit `770d522`): Project CRUD API, Dashboard, Project detail, Create form
- Phase 3 (commits `bbf46eb`/`1cd7547`): POST analyze endpoint, worker with atomic job claiming, AnalysisControls polling
- Phase 4 (commit `9e01e58`): Risk engine, Slither parser, Docker analyzer execution, test-project
- Phase 4 fixes (commits `efa05c9`, `aba8166`, `a4edb24`): Docker pinning, self-contained fixture, E2E fix
- Phase 5 (commits `51f853b` + `2092263`): Complete security analysis dashboard + code review fixes
- Phase 6 (commit `c509dff`): Redis client, cache abstraction, analysis service, Dockerfile, Docker Compose, GitHub Actions CI
- Phase 6 fixes (commit `0db3ff9`): Redis timeout reduction, .dockerignore, health check, CI fix
- Phase 6.5 (commit `6d5d55f`): Production-grade UI/UX polish with design system, professional iconography, accessible components
- Phase 6.5 verification (commit `TBD`): Removed hardcoded Tailwind colors from layout.tsx, tokenized .btn-danger hex values, replaced inline badge in AnalysisControls with StatusBadge, added role="alert" to dashboard error state

### In Progress

(None — Phase 6.5 is complete)

### Planned

- Phase 7: README, architecture diagram, production deployment
- Phase 8: Authentication, RBAC, multi-chain support

### Known Technical Debt / Bugs

(None critical)

### Important Decisions

- Design system uses CSS custom properties in globals.css for consistent theming
- All icons are SVG components in `src/components/icons.tsx` (no external icon library)
- Badge components (`StatusBadge`, `SeverityBadge`, `DeploymentBadge`) provide consistent status display
- Focus ring pattern (`focus-ring` class) ensures keyboard accessibility
- `prefers-reduced-motion` respected via CSS media query
- Dark mode via CSS custom properties (not Tailwind `dark:` prefix)
- FindingTable.tsx removed as dead code (was not imported anywhere)
- `AnalysisControls` uses shared `StatusBadge` component (not manually constructed badge markup)
- `.btn-danger` uses `var(--text-inverse)` and `var(--color-blocked-hover)` tokens (no hardcoded hex)
- Body background uses `var(--background)` from globals.css (no hardcoded Tailwind color classes)
- Dashboard error state uses `role="alert"` for screen reader announcement
- Finding display shows only persisted analyzer data (description, source, contract, file, line) — no fabricated impact/recommendation

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
npm test             # vitest run (123 tests)
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

1. **Phase 7** — README, architecture diagram, production deployment
2. **Phase 8** — Authentication, RBAC, multi-chain support

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
- Phase 6: Redis client (`src/lib/redis.ts`) — lazy singleton, 500ms connection timeout, optional (no REDIS_URL = no Redis)
- Phase 6: Cache abstraction (`src/lib/analysis-cache.ts`) — key format `analysis:{id}`, TTL 300s, versioned envelope
- Phase 6: Analysis service (`src/lib/analysis-service.ts`) — cache-aside pattern, both GET endpoints use cache for terminal analyses
- Phase 6: Docker Compose — postgres (port 5433 default), redis, app services with health checks; worker runs on host
- Phase 6: GitHub Actions CI — quality job (lint, typecheck, test, build) + infra job (postgres, redis, analyzer image)
- Phase 6: `next.config.ts` has `output: "standalone"` for Docker production builds
- Phase 6.5: Design system uses CSS custom properties — all colors defined in `globals.css` with dark mode via `@media (prefers-color-scheme: dark)`
- Phase 6.5: Icons are all SVG components in `src/components/icons.tsx` — no external icon library
- Phase 6.5: Badge components (`StatusBadge`, `SeverityBadge`, `DeploymentBadge`) provide consistent status display
- Phase 6.5: `FindingTable.tsx` was removed as dead code (was not imported anywhere)
- Phase 6.5 verification: `layout.tsx` body uses `var(--background)` from globals.css — no `bg-zinc-*` classes
- Phase 6.5 verification: `.btn-danger` uses `var(--text-inverse)` and `var(--color-blocked-hover)` tokens
- Phase 6.5 verification: `AnalysisControls` imports and uses `StatusBadge` from `./Badge` (not inline badge)
- Phase 6.5 verification: Dashboard error state div has `role="alert"` for screen readers
- Phase 6.5 verification: Finding display fields are description, source, contract, file, line — no impact/recommendation
- Git commits: `6ec16d6` -> `770d522` -> `bbf46eb` -> `1cd7547` -> `9e01e58` -> `efa05c9` -> `aba8166` -> `a4edb24` -> `51f853b` -> `2092263` -> `c509dff` -> `0db3ff9` -> `6d5d55f` (all on master)

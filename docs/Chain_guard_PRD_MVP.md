# ChainGuard — OpenCode Implementation PRD

**Version:** 1.0
**Purpose:** Autonomous implementation by OpenCode coding agent
**Priority:** Working MVP > architectural complexity > visual polish
**Target:** Functional deployed portfolio project
**Development Constraint:** Build the MVP as quickly as possible without sacrificing basic security or code quality.

---

# 1. PROJECT OBJECTIVE

Build **ChainGuard**, a full-stack Smart Contract DevSecOps platform.

ChainGuard allows a developer to provide a Solidity/Foundry project, run automated security analysis, and receive:

* Compilation result
* Test results
* Static security findings
* Security risk score
* Deployment readiness decision
* Historical analysis results

The application must demonstrate both:

## Web2 Engineering

* Next.js
* TypeScript
* REST API
* PostgreSQL
* asynchronous job processing
* Docker
* caching
* Git/GitHub
* CI/CD
* cloud deployment

## Web3 Engineering

* Solidity
* Foundry
* Slither
* smart-contract security analysis
* contract compilation/testing
* vulnerability classification

---

# 2. CRITICAL MVP PRINCIPLE

Do NOT over-engineer.

Do NOT implement:

* Kubernetes
* Kafka
* RabbitMQ
* microservices
* authentication
* billing
* multi-chain support
* AI
* blockchain indexing
* wallet monitoring
* automated mainnet deployment
* complex cloud infrastructure

unless explicitly requested later.

The MVP should be a **modular monolith with one analysis worker**.

---

# 3. CORE USER FLOW

The entire MVP must support this workflow:

```text
User
  |
  v
Create Project
  |
  v
Submit Solidity/Foundry Project
  |
  v
Start Analysis
  |
  v
Create Analysis Job
  |
  v
Background Worker
  |
  +----> forge build
  |
  +----> forge test
  |
  +----> slither
  |
  v
Parse Results
  |
  v
Risk Engine
  |
  v
Deployment Gate
  |
  v
Store Results
  |
  v
Dashboard
```

This workflow is the highest priority.

---

# 4. TECHNOLOGY STACK

Use the following stack unless there is a strong technical reason not to.

## Frontend

* Next.js
* TypeScript
* Tailwind CSS
* Recharts

## Backend

Use Next.js Route Handlers.

Do NOT create a separate Express backend.

## Database

PostgreSQL.

Use Prisma ORM.

## Cache

Redis.

Use Redis only after the core functionality works.

## Blockchain

* Foundry
* Solidity
* Slither

## Runtime

Node.js.

## Containerization

Docker.

## Version Control

Git + GitHub.

## Deployment

Frontend/API:

* Vercel

Worker:

* Any Docker-compatible service.

If worker deployment becomes a blocker, document the worker deployment separately and ensure the local Docker workflow works perfectly.

---

# 5. PROJECT STRUCTURE

Create the following structure:

```text
chainguard/
│
├── app/
│   ├── page.tsx
│   ├── dashboard/
│   │   └── page.tsx
│   ├── projects/
│   │   ├── page.tsx
│   │   └── [id]/
│   │       └── page.tsx
│   │
│   └── api/
│       ├── projects/
│       │   ├── route.ts
│       │   └── [id]/
│       │       ├── route.ts
│       │       └── analyze/
│       │           └── route.ts
│       │
│       └── analyses/
│           └── [id]/
│               └── route.ts
│
├── components/
│   ├── Navbar.tsx
│   ├── ProjectCard.tsx
│   ├── RiskScore.tsx
│   ├── FindingTable.tsx
│   ├── AnalysisStatus.tsx
│   ├── DeploymentGate.tsx
│   └── MetricsCard.tsx
│
├── lib/
│   ├── db.ts
│   ├── redis.ts
│   ├── risk-engine.ts
│   ├── analysis-parser.ts
│   └── validation.ts
│
├── worker/
│   ├── index.ts
│   ├── analyzer.ts
│   ├── foundry.ts
│   └── slither.ts
│
├── prisma/
│   └── schema.prisma
│
├── test-project/
│   ├── src/
│   ├── test/
│   ├── foundry.toml
│   └── README.md
│
├── Dockerfile
├── docker-compose.yml
├── package.json
├── .env.example
├── README.md
└── .gitignore
```

The agent may modify the structure if required by the chosen implementation, but must preserve the logical separation:

```text
UI
API
Database
Analysis Engine
Worker
Security Tools
```

---

# 6. DATABASE SCHEMA

Use Prisma.

## Project

Fields:

```text
id
name
repositoryUrl
description
createdAt
updatedAt
```

## Analysis

Fields:

```text
id
projectId
status
riskScore
deploymentStatus
compilationStatus
testStatus
totalTests
passedTests
failedTests
startedAt
completedAt
createdAt
```

Allowed status values:

```text
QUEUED
RUNNING
COMPLETED
FAILED
```

Deployment status:

```text
READY
BLOCKED
```

## Finding

Fields:

```text
id
analysisId
severity
type
contract
file
line
description
source
createdAt
```

Severity:

```text
CRITICAL
HIGH
MEDIUM
LOW
```

---

# 7. ENVIRONMENT VARIABLES

Create:

```text
.env.example
```

with:

```env
DATABASE_URL=
REDIS_URL=
WORKER_SECRET=
NEXT_PUBLIC_APP_URL=
```

Never commit real credentials.

---

# 8. PROJECT CREATION API

Implement:

```http
POST /api/projects
```

Request:

```json
{
  "name": "DeFi Vault",
  "repositoryUrl": "https://github.com/example/defi-vault",
  "description": "Example Solidity project"
}
```

Response:

```json
{
  "id": "project-id",
  "name": "DeFi Vault",
  "repositoryUrl": "https://github.com/example/defi-vault"
}
```

Validate:

* name is required
* repositoryUrl must be valid
* prevent obviously malformed URLs

---

# 9. PROJECT LIST API

Implement:

```http
GET /api/projects
```

Return all projects ordered by newest first.

---

# 10. PROJECT DETAILS API

Implement:

```http
GET /api/projects/{id}
```

Return:

* project information
* latest analysis
* analysis history

---

# 11. START ANALYSIS API

Implement:

```http
POST /api/projects/{id}/analyze
```

Behavior:

1. Validate project.
2. Create Analysis record.
3. Set status to `QUEUED`.
4. Return immediately.
5. Worker performs analysis asynchronously.

Response:

```json
{
  "analysisId": "analysis-id",
  "status": "QUEUED"
}
```

Do NOT execute Foundry/Slither synchronously inside the API request.

---

# 12. ANALYSIS WORKER

Create:

```text
worker/index.ts
```

The worker must:

1. Find queued analysis jobs.
2. Mark job `RUNNING`.
3. Obtain the project source.
4. Run analysis.
5. Parse results.
6. Calculate risk score.
7. Calculate deployment status.
8. Store results.
9. Mark analysis `COMPLETED`.

If anything fails:

```text
status = FAILED
```

The worker must never leave an analysis permanently stuck in `RUNNING`.

---

# 13. SOURCE PROJECT HANDLING

For the MVP, support GitHub repository URLs.

Worker flow:

```text
Repository URL
      |
      v
git clone
      |
      v
Temporary directory
      |
      v
Run security tools
      |
      v
Delete temporary directory
```

Use a unique temporary directory for every analysis.

Never reuse another project's directory.

Never execute repository code directly on the application host.

---

# 14. FOUNDRY ANALYSIS

Execute:

```bash
forge build
```

Then:

```bash
forge test
```

Capture:

* exit code
* stdout
* stderr

Determine:

```text
Compilation:
PASS / FAIL

Tests:
PASS / FAIL
```

Extract test counts where practical.

Example:

```text
42 passed
2 failed
```

If exact parsing is difficult, implement a reliable fallback based on exit code and document the limitation.

---

# 15. SLITHER ANALYSIS

Execute:

```bash
slither .
```

Capture output.

Prefer structured output if supported by the installed Slither version.

Normalize findings into:

```json
{
  "severity": "HIGH",
  "type": "reentrancy",
  "contract": "Vault",
  "file": "src/Vault.sol",
  "line": 42,
  "description": "Potential reentrancy vulnerability",
  "source": "slither"
}
```

The parser must tolerate unknown detector types.

If a finding cannot be mapped perfectly to a severity, use a documented fallback severity.

---

# 16. FINDING SEVERITY

Implement the following normalized categories:

```text
CRITICAL
HIGH
MEDIUM
LOW
```

Create a centralized severity mapping inside:

```text
lib/analysis-parser.ts
```

Do NOT scatter severity rules throughout the codebase.

---

# 17. RISK ENGINE

Create:

```text
lib/risk-engine.ts
```

Input:

```text
findings
compilationStatus
testStatus
```

Output:

```text
riskScore
deploymentStatus
```

Start at:

```text
100
```

Apply:

```text
CRITICAL = -30
HIGH     = -15
MEDIUM   = -7
LOW      = -2
```

Additional penalties:

```text
Compilation failure = -20
Failed tests        = -10
```

Minimum:

```text
0
```

Maximum:

```text
100
```

---

# 18. DEPLOYMENT GATE

Default policy:

```text
READY if:

riskScore >= 80
AND criticalFindings == 0
AND compilationStatus == PASS
AND testStatus == PASS
```

Otherwise:

```text
BLOCKED
```

The gate must be deterministic.

Example:

```json
{
  "riskScore": 82,
  "deploymentStatus": "READY"
}
```

---

# 19. REDIS CACHE

After core analysis functionality works, implement Redis.

Cache:

```text
analysis:{analysisId}
```

TTL:

```text
300 seconds
```

Flow:

```text
GET analysis
      |
      v
Redis
  /    \
hit    miss
 |       |
return  PostgreSQL
          |
          v
        Redis
          |
          v
        return
```

If Redis is unavailable, the application must gracefully fall back to PostgreSQL.

Redis failure must NOT break the application.

---

# 20. FRONTEND

The UI should be simple and professional.

Do not spend excessive time on visual design.

---

## Landing Page

Display:

```text
ChainGuard

Smart Contract DevSecOps

Analyze Solidity projects.
Detect security issues.
Evaluate deployment readiness.

[ Open Dashboard ]
```

---

# 21. DASHBOARD

Display:

```text
Projects
```

Each project card:

```text
Project Name
Latest Risk Score
Deployment Status
Last Analysis

[ View ]
```

Button:

```text
+ New Project
```

---

# 22. PROJECT PAGE

Display:

```text
Project Name

[ Run Analysis ]

Latest Analysis
```

Metrics:

```text
Risk Score
Compilation
Tests
Critical
High
Medium
Low
```

Deployment gate:

```text
DEPLOYMENT STATUS

✓ READY
```

or:

```text
DEPLOYMENT STATUS

✕ BLOCKED
```

---

# 23. FINDING TABLE

Display:

| Severity | Type | Contract | File | Line |
| -------- | ---- | -------- | ---- | ---- |

Clicking a finding should reveal:

* Description
* Detection source
* Location

---

# 24. ANALYSIS STATUS

When analysis is running, display:

```text
Analysis in progress...

✓ Job created
✓ Worker started
⟳ Running Foundry
○ Running Slither
○ Calculating risk
```

The UI may poll:

```http
GET /api/analyses/{id}
```

every few seconds.

Stop polling when:

```text
COMPLETED
```

or:

```text
FAILED
```

---

# 25. ANALYSIS HISTORY

Display previous analyses:

```text
Analysis #5
82 / 100
READY
Aug 25

Analysis #4
67 / 100
BLOCKED
Aug 24
```

---

# 26. TEST PROJECT

The repository MUST include a deliberately vulnerable Foundry project under:

```text
test-project/
```

It must contain at least:

* one Solidity contract
* Foundry tests
* at least one intentionally detectable security issue

The README must clearly state:

```text
THIS PROJECT IS INTENTIONALLY VULNERABLE.
DO NOT DEPLOY TO MAINNET.
```

Use this project to demonstrate ChainGuard during development and in the final README.

---

# 27. DOCKER

Create:

```text
Dockerfile
docker-compose.yml
```

Docker Compose should make local development straightforward.

Minimum services:

```text
app
postgres
redis
worker
```

If running the worker inside the same application container is substantially simpler for the MVP, this is acceptable.

The architecture must remain logically separated even if deployment uses fewer containers.

---

# 28. SECURITY REQUIREMENTS

## Mandatory

Never:

* execute arbitrary user code on the host
* store private keys
* store wallet seed phrases
* expose database credentials
* commit `.env`
* trust user-supplied file paths
* allow arbitrary shell command injection through API parameters

Use:

* parameterized database queries through Prisma
* URL validation
* temporary directories
* command argument arrays where possible
* execution timeouts
* Docker isolation

---

# 29. COMMAND EXECUTION SECURITY

Do NOT construct shell commands like:

```text
"forge test " + userInput
```

Avoid shell interpolation.

Use safe process execution APIs with argument arrays.

Example conceptual pattern:

```text
spawn("forge", ["test"], options)
```

Repository URLs must be validated before cloning.

---

# 30. TIMEOUTS

Security analysis must have a timeout.

Initial:

```text
120 seconds
```

If the process exceeds the timeout:

```text
terminate process
mark analysis FAILED
```

Do not allow indefinitely running analysis jobs.

---

# 31. ERROR HANDLING

Every layer must handle errors.

Possible errors:

```text
Invalid project
Invalid repository
Repository clone failure
Compilation failure
Test failure
Slither failure
Parser failure
Database failure
Redis failure
Worker failure
Timeout
```

Return useful errors without exposing secrets or internal filesystem information.

---

# 32. TESTING

Minimum tests:

## Risk Engine

Test:

```text
No findings
Only LOW findings
HIGH findings
CRITICAL findings
Compilation failure
Test failure
Score lower bound
Score upper bound
Deployment gate
```

## API

Test:

```text
Create project
Get projects
Get project
Start analysis
Get analysis
```

## Integration

Run the included vulnerable `test-project`.

Expected result:

```text
Analysis completes
Findings detected
Risk score generated
Deployment gate evaluated
```

---

# 33. GIT WORKFLOW

Create:

```text
main
```

Keep commits meaningful.

Suggested commits:

```text
feat: initialize ChainGuard application
feat: add database schema
feat: add project APIs
feat: add analysis worker
feat: integrate Foundry
feat: integrate Slither
feat: implement risk engine
feat: add dashboard
feat: add Docker development environment
feat: add CI pipeline
```

Do not create unnecessary branches during the MVP.

---

# 34. CI/CD

Create:

```text
.github/workflows/ci.yml
```

Pipeline:

```text
Push
 ↓
npm install
 ↓
Lint
 ↓
Typecheck
 ↓
Unit Tests
 ↓
Build
```

If Foundry is available in CI:

```text
forge build
forge test
```

Otherwise keep the blockchain-specific integration test in the dedicated development environment and document it.

---

# 35. README REQUIREMENTS

README must include:

## 1. Project Overview

Explain ChainGuard in simple language.

## 2. Problem

Explain why smart-contract security needs automated DevSecOps.

## 3. Architecture

Include an architecture diagram.

## 4. Tech Stack

List:

```text
Next.js
TypeScript
PostgreSQL
Prisma
Redis
Docker
Foundry
Slither
GitHub Actions
```

## 5. Features

## 6. Local Setup

## 7. Environment Variables

## 8. Running the Application

## 9. Running the Worker

## 10. Running the Vulnerable Test Project

## 11. Security Considerations

## 12. Limitations

## 13. Future Improvements

---

# 36. LOCAL DEVELOPMENT COMMANDS

The final README should support a workflow approximately equivalent to:

```bash
git clone <repository>

cd chainguard

npm install

cp .env.example .env

docker compose up -d

npx prisma migrate dev

npm run dev
```

Worker:

```bash
npm run worker
```

The exact commands may be adjusted according to implementation.

---

# 37. ACCEPTANCE CRITERIA

The MVP is DONE only when all of the following work:

* [ ] Application starts locally.
* [ ] PostgreSQL connects successfully.
* [ ] Redis connection works or gracefully falls back.
* [ ] User can create a project.
* [ ] Project is persisted.
* [ ] User can start an analysis.
* [ ] Analysis becomes QUEUED.
* [ ] Worker processes the job.
* [ ] Foundry compilation executes.
* [ ] Foundry tests execute.
* [ ] Slither executes.
* [ ] Findings are parsed.
* [ ] Findings are stored.
* [ ] Risk score is calculated.
* [ ] Deployment gate is calculated.
* [ ] Dashboard displays results.
* [ ] Analysis history works.
* [ ] Intentionally vulnerable test project produces findings.
* [ ] Docker setup works.
* [ ] CI passes.
* [ ] README is complete.
* [ ] Production build succeeds.
* [ ] Application is deployed.

---

# 38. DEVELOPMENT PRIORITY

OpenCode MUST implement features in this exact priority:

## Phase 1 — Skeleton

* Next.js
* TypeScript
* Tailwind
* Prisma
* PostgreSQL
* Basic pages

## Phase 2 — Project Management

* Create project
* List projects
* Project details

## Phase 3 — Analysis Engine

* Worker
* Git clone
* Foundry
* Slither

## Phase 4 — Results

* Parser
* Findings
* Risk engine
* Deployment gate

## Phase 5 — Dashboard

* Score
* Findings
* Metrics
* Status
* History

## Phase 6 — Infrastructure

* Redis
* Docker
* CI

## Phase 7 — Polish

* Error states
* Loading states
* README
* Architecture diagram
* Production deployment

Do NOT work on Phase N+1 while Phase N is fundamentally broken.

---

# 39. AGENT EXECUTION RULES

OpenCode should follow these rules.

### Rule 1

Prefer the simplest implementation that satisfies the requirement.

### Rule 2

Do not introduce a new dependency unless necessary.

### Rule 3

Do not introduce microservices.

### Rule 4

Do not rewrite working code without a concrete reason.

### Rule 5

Run tests after significant changes.

### Rule 6

Run the production build before declaring the application complete.

### Rule 7

Fix errors before moving to unrelated features.

### Rule 8

Never fake functionality.

If a feature cannot be implemented reliably, report the limitation rather than creating a mock implementation.

### Rule 9

Do not use hardcoded fake analysis results in the production UI.

All dashboard results must originate from the actual analysis pipeline.

### Rule 10

Keep security-sensitive operations isolated and explicit.

---

# 40. DEFINITION OF A SUCCESSFUL DEMO

The final demo should take approximately:

```text
< 2 minutes
```

Flow:

```text
Open ChainGuard
      ↓
Create "DeFi Vault"
      ↓
Run Analysis
      ↓
Worker starts
      ↓
Foundry runs
      ↓
Slither runs
      ↓
Results appear
      ↓
Risk Score
      ↓
Security Findings
      ↓
Deployment Gate
```

Example final screen:

```text
╔══════════════════════════════════════════╗
║             CHAIN GUARD                  ║
║                                          ║
║  DeFi Vault                              ║
║                                          ║
║  SECURITY SCORE                          ║
║                                          ║
║              72 / 100                    ║
║                                          ║
║  Critical       0                        ║
║  High           1                        ║
║  Medium         3                        ║
║  Low            4                        ║
║                                          ║
║  Compilation    ✓ PASS                   ║
║  Tests          ✓ 42/42                  ║
║  Slither        ⚠ 8 findings             ║
║                                          ║
║  DEPLOYMENT STATUS                       ║
║                                          ║
║              ✕ BLOCKED                   ║
║                                          ║
╚══════════════════════════════════════════╝
```

---

# 41. RESUME OBJECTIVE

The completed project should support this resume entry:

**ChainGuard — Smart Contract DevSecOps Platform**

**Technologies:** Next.js, TypeScript, PostgreSQL, Prisma, Redis, Docker, Foundry, Slither, GitHub Actions

The implementation should demonstrate:

* Full-stack development
* REST API design
* Database design
* Asynchronous processing
* Caching
* Containerization
* CI/CD
* Security engineering
* Solidity development
* Smart-contract testing
* Static analysis
* Risk evaluation

---

# 42. FUTURE ROADMAP

Do NOT implement these during the initial MVP.

Future versions may add:

### V2

* GitHub OAuth
* GitHub App
* Automatic PR scanning
* PR security comments
* Configurable security policies

### V3

* Deployment simulation
* Sepolia deployment
* Contract verification
* Transaction simulation

### V4

* Multi-chain support
* On-chain monitoring
* Deployer wallet risk
* Upgradeability monitoring

### V5

* Team organizations
* RBAC
* Security policies
* Audit trails
* Notifications
* Slack/Discord integration

### V6

* AI-assisted vulnerability explanations
* Historical vulnerability trends
* Security recommendations
* Automated remediation suggestions

---

# 43. FINAL IMPLEMENTATION INSTRUCTION

Build ChainGuard as a **real, working MVP**, not a prototype with mocked functionality.

The highest-priority path is:

```text
Create Project
      ↓
Run Analysis
      ↓
Foundry
      ↓
Slither
      ↓
Parse
      ↓
Risk Score
      ↓
Deployment Gate
      ↓
Dashboard
```

Everything else is secondary.

If a choice must be made between:

```text
more features
```

and

```text
a completely working end-to-end pipeline
```

choose the completely working pipeline.

The final application must be capable of analyzing the included intentionally vulnerable Foundry project and displaying real security findings and a real calculated deployment decision.

**Do not declare the project complete until the complete pipeline has been tested end-to-end.**

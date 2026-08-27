#!/usr/bin/env bash
set -euo pipefail

# ─── Configuration ──────────────────────────────────────────────────
E2E_TEST_REPO_URL="${E2E_TEST_REPO_URL:-}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
PORT="${PORT:-3000}"
BASE_URL="http://localhost:${PORT}"
POLL_INTERVAL=3
ANALYSIS_TIMEOUT=300
SERVER_STARTUP_TIMEOUT=60
PORT_FREE_TIMEOUT=15

# ─── Ownership tracking ─────────────────────────────────────────────
NEXTJS_STARTED_BY_E2E=false
WORKER_STARTED_BY_E2E=false
E2E_OWNED_PIDS=()

# ─── Logging ────────────────────────────────────────────────────────
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
NC='\033[0m'

log()   { echo -e "${GREEN}[e2e]${NC} $*"; }
log_v() { echo -e "${GREEN}[e2e]${NC} $*" >&2; }
warn()  { echo -e "${YELLOW}[e2e]${NC} $*"; }
fail()  { echo -e "${RED}[e2e]${NC} $*"; }

# ─── Cleanup ────────────────────────────────────────────────────────
cleanup() {
  log "Cleaning up E2E-owned processes..."
  for pid in "${E2E_OWNED_PIDS[@]}"; do
    if kill -0 "$pid" 2>/dev/null; then
      kill "$pid" 2>/dev/null || true
      wait "$pid" 2>/dev/null || true
    fi
  done
  log "Cleanup done."
}
trap cleanup EXIT

# ─── Helpers ────────────────────────────────────────────────────────
wait_port_free() {
  local port="$1"
  local timeout="$2"
  local elapsed=0
  while (( elapsed < timeout )); do
    local pids
    pids=$(lsof -ti :"$port" 2>/dev/null || true)
    if [[ -z "$pids" ]]; then
      return 0
    fi
    sleep 1
    elapsed=$((elapsed + 1))
  done
  local remaining
  remaining=$(lsof -ti :"$port" 2>/dev/null || true)
  fail "Port $port still occupied after ${timeout}s (PIDs: $remaining)"
  return 1
}

kill_port_occupant() {
  local port="$1"
  local pids
  pids=$(lsof -ti :"$port" 2>/dev/null || true)
  if [[ -z "$pids" ]]; then
    return 0
  fi
  warn "Port $port occupied by PIDs: $pids — sending SIGTERM..."
  echo "$pids" | xargs kill 2>/dev/null || true
  sleep 2

  pids=$(lsof -ti :"$port" 2>/dev/null || true)
  if [[ -n "$pids" ]]; then
    warn "SIGTERM did not release port $port, sending SIGKILL..."
    echo "$pids" | xargs kill -9 2>/dev/null || true
    sleep 1
  fi
  wait_port_free "$port" "$PORT_FREE_TIMEOUT"
}

# ─── [1/8] Preflight checks ────────────────────────────────────────
preflight() {
  log "[1/8] Preflight checks..."

  if [[ -z "$E2E_TEST_REPO_URL" ]]; then
    fail "E2E_TEST_REPO_URL is not set."
    fail "Usage: E2E_TEST_REPO_URL=https://github.com/.../repo bash scripts/e2e-test.sh"
    exit 1
  fi

  if ! command -v docker &>/dev/null; then
    fail "Docker is not installed or not in PATH."
    exit 1
  fi

  if ! docker info &>/dev/null; then
    fail "Docker daemon is not running."
    exit 1
  fi
  log "  Docker: OK"

  if ! docker image inspect chainguard-analyzer:latest &>/dev/null; then
    fail "chainguard-analyzer:latest image not found. Build it first:"
    fail "  docker build -t chainguard-analyzer -f docker/analyzer/Dockerfile ."
    exit 1
  fi
  log "  Docker image: OK"

  # Kill stale worker processes from previous E2E runs only
  local stale_workers
  stale_workers=$(pgrep -f 'npx tsx worker/index\.ts' 2>/dev/null || true)
  if [[ -n "$stale_workers" ]]; then
    warn "  Killing stale worker processes: $stale_workers"
    echo "$stale_workers" | xargs kill 2>/dev/null || true
    sleep 1
  fi

  # Check guardrails-postgres container
  local pg_status
  pg_status=$(docker ps -a --filter name=guardrails-postgres --format '{{.Status}}' 2>/dev/null || true)

  if [[ -z "$pg_status" ]]; then
    fail "guardrails-postgres container does not exist."
    exit 1
  fi

  if echo "$pg_status" | grep -q "Up"; then
    log "  PostgreSQL: already running ($pg_status)"
  else
    log "  PostgreSQL: container exists but stopped. Starting..."
    docker start guardrails-postgres
    log "  PostgreSQL: started"
  fi

  # Wait for PostgreSQL to accept connections
  log "  Waiting for PostgreSQL..."
  local retries=30
  while (( retries > 0 )); do
    if docker exec guardrails-postgres pg_isready -U guardrails -d guardrails &>/dev/null; then
      log "  PostgreSQL: ready"
      break
    fi
    retries=$((retries - 1))
    sleep 1
  done

  if (( retries == 0 )); then
    fail "PostgreSQL did not become ready within 30s."
    exit 1
  fi

  # Verify .env DATABASE_URL is set
  if [[ ! -f "$PROJECT_DIR/.env" ]]; then
    fail ".env file not found at $PROJECT_DIR/.env"
    exit 1
  fi
  log "  Environment: OK"
}

# ─── [2/8] Ensure port is free ──────────────────────────────────────
ensure_port_free() {
  log "[2/8] Ensuring port $PORT is free..."
  kill_port_occupant "$PORT"
  log "  Port $PORT: free"
}

# ─── [3/8] Start Next.js ────────────────────────────────────────────
start_nextjs() {
  log "[3/8] Starting Next.js dev server on port $PORT..."
  cd "$PROJECT_DIR"
  npm run dev -- --port "$PORT" &>/tmp/e2e-nextjs.log &
  NEXTJS_PID=$!
  NEXTJS_STARTED_BY_E2E=true
  E2E_OWNED_PIDS+=("$NEXTJS_PID")

  log "  Waiting for Next.js to be ready (pid $NEXTJS_PID)..."
  local retries=$((SERVER_STARTUP_TIMEOUT / POLL_INTERVAL))
  while (( retries > 0 )); do
    # Verify the exact PID is still alive
    if ! kill -0 "$NEXTJS_PID" 2>/dev/null; then
      fail "Next.js process (pid $NEXTJS_PID) died during startup."
      fail "Log (last 30 lines):"
      tail -30 /tmp/e2e-nextjs.log
      return 1
    fi

    # Check HTTP readiness
    if curl -s -o /dev/null "$BASE_URL" 2>/dev/null; then
      log "  Next.js: ready on port $PORT (pid $NEXTJS_PID)"
      return 0
    fi

    retries=$((retries - 1))
    sleep "$POLL_INTERVAL"
  done

  fail "Next.js did not start within ${SERVER_STARTUP_TIMEOUT}s."
  fail "Log (last 30 lines):"
  tail -30 /tmp/e2e-nextjs.log
  return 1
}

# ─── [4/8] Start worker ─────────────────────────────────────────────
start_worker() {
  log "[4/8] Starting worker..."
  cd "$PROJECT_DIR"
  npx tsx worker/index.ts &>/tmp/e2e-worker.log &
  WORKER_PID=$!
  WORKER_STARTED_BY_E2E=true
  E2E_OWNED_PIDS+=("$WORKER_PID")

  # Wait for worker to initialize
  sleep 5
  if kill -0 "$WORKER_PID" 2>/dev/null; then
    log "  Worker started (pid $WORKER_PID)"
  else
    fail "Worker failed to start. Log:"
    cat /tmp/e2e-worker.log
    return 1
  fi
}

# ─── API helpers ────────────────────────────────────────────────────
api_post() {
  local endpoint="$1"
  local data="$2"
  curl -s -X POST "$BASE_URL$endpoint" \
    -H "Content-Type: application/json" \
    -d "$data"
}

api_get() {
  local endpoint="$1"
  curl -s "$BASE_URL$endpoint"
}

# ─── [5/8] Create project ───────────────────────────────────────────
create_project() {
  log "[5/8] Creating project..."
  CREATE_PROJECT_ID=""
  local project_response
  project_response=$(api_post "/api/projects" \
    "{\"name\":\"E2E Test Vault\",\"repositoryUrl\":\"$E2E_TEST_REPO_URL\",\"description\":\"E2E integration test\"}")

  CREATE_PROJECT_ID=$(echo "$project_response" | node -e "
    const data = JSON.parse(require('fs').readFileSync('/dev/stdin','utf8'));
    if (data.error) { console.error('ERROR:', data.error); process.exit(1); }
    console.log(data.id);
  " 2>/dev/null)

  if [[ -z "$CREATE_PROJECT_ID" ]]; then
    fail "Failed to create project."
    fail "Response: $project_response"
    return 1
  fi
  log "  Project created: $CREATE_PROJECT_ID"
}

# ─── [6/8] Trigger analysis ─────────────────────────────────────────
trigger_analysis() {
  local project_id="$1"
  log "[6/8] Triggering analysis..."
  TRIGGER_ANALYSIS_ID=""
  local analyze_response
  analyze_response=$(api_post "/api/projects/${project_id}/analyze" "{}")

  TRIGGER_ANALYSIS_ID=$(echo "$analyze_response" | node -e "
    const data = JSON.parse(require('fs').readFileSync('/dev/stdin','utf8'));
    if (data.error) { console.error('ERROR:', data.error); process.exit(1); }
    console.log(data.analysisId);
  " 2>/dev/null)

  if [[ -z "$TRIGGER_ANALYSIS_ID" ]]; then
    fail "Failed to trigger analysis."
    fail "Response: $analyze_response"
    return 1
  fi
  log "  Analysis queued: $TRIGGER_ANALYSIS_ID"
}

# ─── [7/8] Poll result ──────────────────────────────────────────────
poll_result() {
  local analysis_id="$1"
  log "[7/8] Polling for analysis completion (timeout: ${ANALYSIS_TIMEOUT}s)..."
  POLL_RESULT_DATA=""
  local elapsed=0
  local status=""

  while (( elapsed < ANALYSIS_TIMEOUT )); do
    POLL_RESULT_DATA=$(api_get "/api/analyses/${analysis_id}")
    status=$(echo "$POLL_RESULT_DATA" | node -e "
      const data = JSON.parse(require('fs').readFileSync('/dev/stdin','utf8'));
      console.log(data.status || 'UNKNOWN');
    " 2>/dev/null)

    log "  [${elapsed}s] Status: $status"

    if [[ "$status" == "COMPLETED" || "$status" == "FAILED" ]]; then
      break
    fi

    sleep "$POLL_INTERVAL"
    elapsed=$((elapsed + POLL_INTERVAL))
  done

  if [[ "$status" != "COMPLETED" ]]; then
    fail "Analysis did not complete successfully. Final status: $status"
    fail "Analysis data: $POLL_RESULT_DATA"
    fail "Worker log (last 50 lines):"
    tail -50 /tmp/e2e-worker.log
    return 1
  fi
}

# ─── [8/8] Verification ────────────────────────────────────────────
verify_results() {
  local analysis_data="$1"
  log "[8/8] Verification..."
  log ""

  local assertions_passed=true

  # Parse all fields from the analysis response
  local compilation_status test_status risk_score deployment_status finding_count
  compilation_status=$(echo "$analysis_data" | node -e "
    const d = JSON.parse(require('fs').readFileSync('/dev/stdin','utf8'));
    console.log(d.compilationStatus || 'null');
  " 2>/dev/null)
  test_status=$(echo "$analysis_data" | node -e "
    const d = JSON.parse(require('fs').readFileSync('/dev/stdin','utf8'));
    console.log(d.testStatus || 'null');
  " 2>/dev/null)
  risk_score=$(echo "$analysis_data" | node -e "
    const d = JSON.parse(require('fs').readFileSync('/dev/stdin','utf8'));
    console.log(d.riskScore ?? 'null');
  " 2>/dev/null)
  deployment_status=$(echo "$analysis_data" | node -e "
    const d = JSON.parse(require('fs').readFileSync('/dev/stdin','utf8'));
    console.log(d.deploymentStatus || 'null');
  " 2>/dev/null)
  finding_count=$(echo "$analysis_data" | node -e "
    const d = JSON.parse(require('fs').readFileSync('/dev/stdin','utf8'));
    console.log(d.findingCount ?? 0);
  " 2>/dev/null)

  local analysis_id
  analysis_id=$(echo "$analysis_data" | node -e "
    const d = JSON.parse(require('fs').readFileSync('/dev/stdin','utf8'));
    console.log(d.id);
  " 2>/dev/null)

  log "Results:"
  log "  compilationStatus: $compilation_status"
  log "  testStatus:        $test_status"
  log "  riskScore:         $risk_score"
  log "  deploymentStatus:  $deployment_status"
  log "  findingCount:      $finding_count"
  log ""

  # Assertion: compilationStatus === PASS
  if [[ "$compilation_status" != "PASS" ]]; then
    fail "FAIL: compilationStatus should be PASS, got $compilation_status"
    assertions_passed=false
  else
    log "PASS: compilationStatus is PASS"
  fi

  # Assertion: testStatus === PASS
  if [[ "$test_status" != "PASS" ]]; then
    fail "FAIL: testStatus should be PASS, got $test_status"
    assertions_passed=false
  else
    log "PASS: testStatus is PASS"
  fi

  # Assertion: riskScore is non-null, >= 0, <= 100
  if [[ "$risk_score" == "null" ]]; then
    fail "FAIL: riskScore is null"
    assertions_passed=false
  else
    if (( risk_score >= 0 && risk_score <= 100 )); then
      log "PASS: riskScore is $risk_score (within 0-100)"
    else
      fail "FAIL: riskScore $risk_score is outside 0-100"
      assertions_passed=false
    fi
  fi

  # Assertion: riskScore < 100 for vulnerable fixture
  if [[ "$risk_score" != "null" ]]; then
    if (( risk_score < 100 )); then
      log "PASS: riskScore $risk_score < 100 (vulnerabilities detected)"
    else
      fail "FAIL: riskScore is 100 — no vulnerabilities detected in vulnerable fixture"
      assertions_passed=false
    fi
  fi

  # Assertion: findingCount >= 1
  if (( finding_count >= 1 )); then
    log "PASS: findingCount is $finding_count (>= 1)"
  else
    fail "FAIL: findingCount is $finding_count, expected >= 1"
    assertions_passed=false
  fi

  # Assertion: deploymentStatus matches policy
  local expected_deployment="BLOCKED"
  if (( risk_score >= 80 )) && [[ "$compilation_status" == "PASS" ]] && [[ "$test_status" == "PASS" ]]; then
    expected_deployment="READY"
  fi

  if [[ "$deployment_status" == "$expected_deployment" ]]; then
    log "PASS: deploymentStatus is $deployment_status (matches policy)"
  else
    if [[ "$expected_deployment" == "READY" ]]; then
      log "INFO: deploymentStatus is $deployment_status, expected $expected_deployment (will verify with DB)"
    else
      fail "FAIL: deploymentStatus should be $expected_deployment, got $deployment_status"
      assertions_passed=false
    fi
  fi

  # Verify findings in database
  log ""
  log "Verifying findings in database..."
  local findings_check
  findings_check=$(docker exec guardrails-postgres psql -U guardrails -d guardrails -t -A -c "
    SELECT COUNT(*) FROM findings WHERE \"analysisId\" = '$analysis_id';
  " 2>/dev/null)

  local db_finding_count
  db_finding_count=$(echo "$findings_check" | tr -d '[:space:]')

  if (( db_finding_count >= 1 )); then
    log "PASS: $db_finding_count finding(s) persisted in database"
  else
    fail "FAIL: No findings in database for analysis $analysis_id"
    assertions_passed=false
  fi

  # Show sample findings
  if (( db_finding_count >= 1 )); then
    log ""
    log "Sample findings from database:"
    docker exec guardrails-postgres psql -U guardrails -d guardrails -c "
      SELECT severity, type, file, line
      FROM findings
      WHERE \"analysisId\" = '$analysis_id'
      LIMIT 5;
    " 2>/dev/null
  fi

  # Re-verify deploymentStatus with CRITICAL check if needed
  if [[ "$deployment_status" != "$expected_deployment" ]]; then
    local critical_count
    critical_count=$(docker exec guardrails-postgres psql -U guardrails -d guardrails -t -A -c "
      SELECT COUNT(*) FROM findings WHERE \"analysisId\" = '$analysis_id' AND severity = 'CRITICAL';
    " 2>/dev/null)
    critical_count=$(echo "$critical_count" | tr -d '[:space:]')

    if (( critical_count > 0 )); then
      expected_deployment="BLOCKED"
    fi

    if [[ "$deployment_status" == "$expected_deployment" ]]; then
      log "PASS: deploymentStatus is $deployment_status (matches policy with $critical_count CRITICAL findings)"
    else
      fail "FAIL: deploymentStatus should be $expected_deployment, got $deployment_status"
      assertions_passed=false
    fi
  fi

  # Show full analysis record
  log ""
  log "Full analysis record:"
  docker exec guardrails-postgres psql -U guardrails -d guardrails -c "
    SELECT id, status, \"compilationStatus\", \"testStatus\", \"riskScore\",
           \"deploymentStatus\", \"totalTests\", \"passedTests\", \"failedTests\"
    FROM analyses WHERE id = '$analysis_id';
  " 2>/dev/null

  # Final summary
  log ""
  log "═══════════════════════════════════════════════════════════════"
  if [[ "$assertions_passed" == "true" ]]; then
    log "ALL ASSERTIONS PASSED"
    log "Phase 4 E2E integration test: SUCCESS"
  else
    fail "SOME ASSERTIONS FAILED"
    fail "Phase 4 E2E integration test: FAILED"
    return 1
  fi
  log "═══════════════════════════════════════════════════════════════"
}

# ─── Main ───────────────────────────────────────────────────────────
main() {
  log "═══════════════════════════════════════════════════════════════"
  log "Phase 4 E2E Integration Test"
  log "Test repo: $E2E_TEST_REPO_URL"
  log "═══════════════════════════════════════════════════════════════"
  log ""

  preflight
  ensure_port_free
  start_nextjs
  start_worker

  create_project
  trigger_analysis "$CREATE_PROJECT_ID"
  poll_result "$TRIGGER_ANALYSIS_ID"
  verify_results "$POLL_RESULT_DATA"
}

main "$@"

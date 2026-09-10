#!/usr/bin/env bash
set -euo pipefail

# Safe attach-only real-runtime E2E runner. It never starts/stops processes,
# containers, ports, volumes, or pre-existing database records.
BASE_URL="${BASE_URL:-http://localhost:3000}"
E2E_TEST_REPO_URL="${E2E_TEST_REPO_URL:?Set E2E_TEST_REPO_URL to a public HTTPS GitHub repository}"
E2E_MODE="${E2E_MODE:-fixture}"
ANALYSIS_TIMEOUT="${ANALYSIS_TIMEOUT:-360}"
POLL_INTERVAL="${POLL_INTERVAL:-3}"

case "$E2E_MODE" in
  fixture|terralink|no-contract) ;;
  *) echo "Unsupported E2E_MODE: $E2E_MODE" >&2; exit 2 ;;
esac

curl -fsS "$BASE_URL" >/dev/null || {
  echo "ChainGuard app is not reachable at $BASE_URL" >&2
  exit 1
}

project_payload=$(node -e '
  const [name, repositoryUrl] = process.argv.slice(1);
  process.stdout.write(JSON.stringify({name, repositoryUrl, description: "Real-runtime P1A regression"}));
' "P1A ${E2E_MODE} $(date +%s)" "$E2E_TEST_REPO_URL")
project_response=$(curl -fsS -X POST "$BASE_URL/api/projects" -H 'Content-Type: application/json' -d "$project_payload")
project_id=$(node -e 'const d=JSON.parse(process.argv[1]); if(!d.id) process.exit(1); console.log(d.id)' "$project_response")
analysis_response=$(curl -fsS -X POST "$BASE_URL/api/projects/$project_id/analyze" -H 'Content-Type: application/json' -d '{}')
analysis_id=$(node -e 'const d=JSON.parse(process.argv[1]); if(!d.analysisId) process.exit(1); console.log(d.analysisId)' "$analysis_response")

elapsed=0
result=''
while (( elapsed < ANALYSIS_TIMEOUT )); do
  result=$(curl -fsS "$BASE_URL/api/analyses/$analysis_id")
  status=$(node -e 'console.log(JSON.parse(process.argv[1]).status)' "$result")
  if [[ "$status" == "COMPLETED" || "$status" == "FAILED" ]]; then break; fi
  sleep "$POLL_INTERVAL"
  elapsed=$((elapsed + POLL_INTERVAL))
done

detail=$(BASE_URL="$BASE_URL" PROJECT_ID="$project_id" ANALYSIS_ID="$analysis_id" node <<'NODE'
async function main() {
  const base = `${process.env.BASE_URL}/api/projects/${process.env.PROJECT_ID}/analyses/${process.env.ANALYSIS_ID}`;
  const first = await fetch(`${base}?page=1&pageSize=50`).then((response) => {
    if (!response.ok) throw new Error("Unable to load findings page 1");
    return response.json();
  });
  const findings = [...first.findings];
  for (let page = 2; page <= first.findingsPagination.totalPages; page++) {
    const next = await fetch(`${base}?page=${page}&pageSize=50`).then((response) => {
      if (!response.ok) throw new Error(`Unable to load findings page ${page}`);
      return response.json();
    });
    findings.push(...next.findings);
  }
  if (findings.length !== first.findingsPagination.total) throw new Error("Incomplete paginated findings evidence");
  process.stdout.write(JSON.stringify({ ...first, findings }));
}
main().catch((error) => { console.error(error.message); process.exit(1); });
NODE
)
E2E_MODE="$E2E_MODE" RESULT_JSON="$result" DETAIL_JSON="$detail" node <<'NODE'
const assert = require("node:assert/strict");
const mode = process.env.E2E_MODE;
const result = JSON.parse(process.env.RESULT_JSON);
const detail = JSON.parse(process.env.DETAIL_JSON);
assert.equal(result.status, "COMPLETED");
assert.equal(result.evidenceStatus, "VERIFIED");
assert.equal(typeof result.firstPartySourcesDiscovered, "number");
assert.equal(typeof result.dependencySourcesDiscovered, "number");
assert.equal(typeof result.generatedSourcesDiscovered, "number");
assert.equal(typeof result.firstPartySourcesTargeted, "number");
assert.equal(typeof result.sourcesRejected, "number");
assert.ok(Array.isArray(result.discoveryReasons));

if (mode === "no-contract") {
  assert.equal(result.riskScore, null);
  assert.equal(result.deploymentStatus, "BLOCKED");
  assert.equal(result.securityAnalysisStatus, "NO_CONTRACTS_FOUND");
  assert.deepEqual(result.gateReasons, ["NO_CONTRACTS_FOUND"]);
  console.log(JSON.stringify({
    analysisId: result.id, mode, riskScore: result.riskScore,
    deploymentStatus: result.deploymentStatus,
    securityAnalysisStatus: result.securityAnalysisStatus,
    firstPartySourcesDiscovered: result.firstPartySourcesDiscovered,
    dependencySourcesDiscovered: result.dependencySourcesDiscovered,
    generatedSourcesDiscovered: result.generatedSourcesDiscovered,
    firstPartySourcesTargeted: result.firstPartySourcesTargeted,
    sourcesRejected: result.sourcesRejected,
    discoveryReasons: result.discoveryReasons,
    gateReasons: result.gateReasons,
  }, null, 2));
} else {
  assert.equal(result.compilationStatus, "PASS");
  assert.equal(result.testStatus, "PASS");
  assert.equal(result.totalTests, 3);
  assert.equal(result.passedTests, 3);
  assert.equal(result.failedTests, 0);
  assert.equal(result.securityAnalysisStatus, "PASS");
  assert.equal(result.coverage, "FULL");
  assert.equal(typeof result.riskScore, "number");
  const scoped = detail.findings.reduce((counts, finding) => {
    counts[finding.scope] = (counts[finding.scope] || 0) + 1;
    return counts;
  }, {});
  const firstParty = detail.findings.filter((finding) => finding.scope === "FIRST_PARTY");
  const deductions = {CRITICAL: 30, HIGH: 15, MEDIUM: 7, LOW: 2};
  const expectedScore = Math.max(0, firstParty.reduce(
    (score, finding) => score - deductions[finding.severity], 100,
  ));
  assert.equal(result.riskScore, expectedScore, "score must use first-party findings only");
  if (mode === "fixture") {
    assert.equal(result.riskScore, 66);
    assert.equal(result.deploymentStatus, "BLOCKED");
    assert.deepEqual(firstParty.reduce((counts, finding) => {
      counts[finding.severity] = (counts[finding.severity] || 0) + 1;
      return counts;
    }, {}), {CRITICAL: 1, LOW: 2});
  }
  console.log(JSON.stringify({
    analysisId: result.id, mode, riskScore: result.riskScore,
    deploymentStatus: result.deploymentStatus,
    contractsDiscovered: result.contractsDiscovered,
    contractsCompiled: result.contractsCompiled,
    contractsTargetedForScan: result.contractsTargetedForScan,
    firstPartySourcesDiscovered: result.firstPartySourcesDiscovered,
    dependencySourcesDiscovered: result.dependencySourcesDiscovered,
    generatedSourcesDiscovered: result.generatedSourcesDiscovered,
    firstPartySourcesTargeted: result.firstPartySourcesTargeted,
    filesScanned: result.filesScanned,
    sourcesRejected: result.sourcesRejected,
    discoveryReasons: result.discoveryReasons,
    findingsByScope: scoped,
  }, null, 2));
}
NODE

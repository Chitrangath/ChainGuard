import type {
  Severity,
  CompilationStatus,
  DeploymentStatus,
} from "../generated/prisma/enums";
import type { GateReason, TestResult, SecurityAnalysisStatus } from "../../worker/types";

const SEVERITY_DEDUCTIONS: Record<Severity, number> = {
  CRITICAL: 30,
  HIGH: 15,
  MEDIUM: 7,
  LOW: 2,
};

const COMPILATION_FAILURE_PENALTY = 20;
const TEST_FAILURE_PENALTY = 10;

export interface RiskInput {
  severityCounts: Record<Severity, number>;
  compilationStatus: CompilationStatus;
  testStatus: TestResult["status"] | CompilationStatus;
  securityAnalysisStatus?: SecurityAnalysisStatus;
}

export interface RiskResult {
  riskScore: number | null;
  deploymentStatus: DeploymentStatus;
  criticalFindings: number;
  gateReasons: GateReason[];
}

function isScanTrustworthy(
  securityAnalysisStatus: SecurityAnalysisStatus | undefined,
  compilationStatus: CompilationStatus,
): boolean {
  if (securityAnalysisStatus === "FAIL" || securityAnalysisStatus === "NOT_RUN") return false;
  if (compilationStatus === "FAIL") return false;
  return true;
}

function buildGateReasons(
  score: number,
  criticalFindings: number,
  compilationStatus: CompilationStatus,
  testStatus: TestResult["status"] | CompilationStatus,
  securityAnalysisStatus: SecurityAnalysisStatus | undefined,
): GateReason[] {
  const reasons: GateReason[] = [];

  if (compilationStatus === "FAIL") reasons.push("COMPILATION_FAILED");
  if (compilationStatus === "UNSUPPORTED") reasons.push("COMPILATION_UNSUPPORTED");

  if (testStatus === "NO_TESTS") reasons.push("NO_TESTS");
  if (testStatus === "NOT_RUN") reasons.push("TESTS_NOT_RUN");
  if (testStatus === "FAIL") reasons.push("TESTS_FAILED");
  if (testStatus === "ERROR") reasons.push("TESTS_ERROR");

  if (securityAnalysisStatus === "FAIL") reasons.push("STATIC_ANALYSIS_FAILED");
  if (securityAnalysisStatus === "NOT_RUN") reasons.push("STATIC_ANALYSIS_NOT_RUN");
  if (securityAnalysisStatus === "UNSUPPORTED") reasons.push("STATIC_ANALYSIS_UNSUPPORTED");
  if (securityAnalysisStatus === "NO_CONTRACTS_FOUND") reasons.push("NO_CONTRACTS_FOUND");

  if (criticalFindings > 0) reasons.push("CRITICAL_FINDINGS");
  if (score < 80) reasons.push("SCORE_BELOW_THRESHOLD");

  return reasons;
}

export function calculateRisk(input: RiskInput): RiskResult {
  const scanTrustworthy = isScanTrustworthy(
    input.securityAnalysisStatus,
    input.compilationStatus,
  );

  if (!scanTrustworthy) {
    return {
      riskScore: null,
      deploymentStatus: "BLOCKED",
      criticalFindings: 0,
      gateReasons: buildGateReasons(
        0,
        0,
        input.compilationStatus,
        input.testStatus,
        input.securityAnalysisStatus,
      ),
    };
  }

  let score = 100;
  let criticalFindings = 0;

  for (const [severity, count] of Object.entries(input.severityCounts) as [Severity, number][]) {
    const deduction = SEVERITY_DEDUCTIONS[severity] * count;
    score -= deduction;
    if (severity === "CRITICAL") {
      criticalFindings = count;
    }
  }

  if (input.compilationStatus === "FAIL") {
    score -= COMPILATION_FAILURE_PENALTY;
  }

  if (input.testStatus === "FAIL") {
    score -= TEST_FAILURE_PENALTY;
  }

  score = Math.max(0, Math.min(100, score));

  const hasCriticals = criticalFindings > 0;
  const compilationPassed = input.compilationStatus === "PASS";
  const testsPassed = input.testStatus === "PASS";
  const scanPassed = input.securityAnalysisStatus === "PASS";

  const deploymentStatus: DeploymentStatus =
    score >= 80 && !hasCriticals && compilationPassed && testsPassed && scanPassed
      ? "READY"
      : "BLOCKED";

  return {
    riskScore: score,
    deploymentStatus,
    criticalFindings,
    gateReasons: buildGateReasons(
      score,
      criticalFindings,
      input.compilationStatus,
      input.testStatus,
      input.securityAnalysisStatus,
    ),
  };
}

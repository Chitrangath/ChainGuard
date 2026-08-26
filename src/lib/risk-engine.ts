import type { Severity, CompilationStatus, TestStatus, DeploymentStatus } from "../generated/prisma/enums";

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
  testStatus: TestStatus;
}

export interface RiskResult {
  riskScore: number;
  deploymentStatus: DeploymentStatus;
  criticalFindings: number;
}

export function calculateRisk(input: RiskInput): RiskResult {
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

  const deploymentStatus: DeploymentStatus =
    score >= 80 && !hasCriticals && compilationPassed && testsPassed
      ? "READY"
      : "BLOCKED";

  return { riskScore: score, deploymentStatus, criticalFindings };
}

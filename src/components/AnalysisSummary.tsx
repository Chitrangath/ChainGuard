import { RiskScore } from "./RiskScore";
import { DeploymentGate } from "./DeploymentGate";
import { MetricsCard } from "./MetricsCard";
import { SeverityBar } from "./SeverityBar";
import { AlertIcon } from "./icons";
import { countBySeverity } from "@/lib/analysis-utils";
import type { AnalysisData } from "@/lib/analysis-utils";

interface AnalysisSummaryProps {
  analysis: AnalysisData;
}

function formatDuration(
  startedAt: string | null,
  completedAt: string | null,
): string | null {
  if (!startedAt || !completedAt) return null;
  const ms = new Date(completedAt).getTime() - new Date(startedAt).getTime();
  const seconds = Math.round(ms / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  const remaining = seconds % 60;
  return remaining > 0 ? `${minutes}m ${remaining}s` : `${minutes}m`;
}

function formatTimestamp(isoStr: string): string {
  const d = new Date(isoStr);
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatTestStatus(analysis: AnalysisData): string {
  if (analysis.testStatus === "PASS" && analysis.totalTests !== null) {
    return `${analysis.passedTests ?? 0}/${analysis.totalTests}`;
  }
  if (analysis.testStatus === "FAIL" && analysis.totalTests !== null) {
    return `${analysis.passedTests ?? 0}/${analysis.totalTests}`;
  }
  if (analysis.testStatus === "NO_TESTS") return "No Tests";
  if (analysis.testStatus === "NOT_RUN") return "Not Run";
  if (analysis.testStatus === "ERROR") return "Error";
  return "—";
}

function formatTestStatusMetric(analysis: AnalysisData): "pass" | "fail" | "neutral" {
  if (analysis.testStatus === "PASS") return "pass";
  if (analysis.testStatus === "FAIL") return "fail";
  return "neutral";
}

function formatCompilationStatus(status: string | null): "pass" | "fail" | "neutral" {
  if (status === "PASS") return "pass";
  if (status === "FAIL") return "fail";
  if (status === "UNSUPPORTED") return "fail";
  return "neutral";
}

function formatGateReasons(reasons: string[]): string[] {
  const labels: Record<string, string> = {
    SCORE_BELOW_THRESHOLD: "Score below threshold",
    CRITICAL_FINDINGS: "Critical findings present",
    COMPILATION_FAILED: "Compilation failed",
    COMPILATION_UNSUPPORTED: "Unsupported compiler",
    NO_TESTS: "No tests found",
    TESTS_NOT_RUN: "Tests not executed",
    TESTS_FAILED: "Tests failed",
    TESTS_ERROR: "Test execution error",
    STATIC_ANALYSIS_FAILED: "Static analysis failed",
    STATIC_ANALYSIS_NOT_RUN: "Static analysis not executed",
    STATIC_ANALYSIS_UNSUPPORTED: "Unsupported toolchain",
    NO_CONTRACTS_FOUND: "No contracts found",
    INCOMPLETE_ANALYSIS: "Incomplete analysis",
  };
  return reasons.map((r) => labels[r] ?? r);
}

export function AnalysisSummary({ analysis }: AnalysisSummaryProps) {
  if (analysis.evidenceStatus === "LEGACY_UNVERIFIED") {
    return (
      <div className="mt-8 rounded-lg border p-6" role="status" style={{ borderColor: "var(--color-medium)" }}>
        <div className="text-label" style={{ color: "var(--color-medium)" }}>
          Legacy analysis — rerun required
        </div>
        <p className="mt-2 text-body" style={{ color: "var(--color-text-secondary)" }}>
          This historical result predates the current evidence model. Its score and findings are not verified.
        </p>
      </div>
    );
  }
  const severityCounts = countBySeverity(analysis.findings);
  const totalFindings = analysis.findings.length;
  const duration = formatDuration(analysis.startedAt, analysis.completedAt);
  const isTerminal =
    analysis.status === "COMPLETED" || analysis.status === "FAILED";

  const hasTrustworthyScan =
    analysis.securityAnalysisStatus === "PASS" ||
    (analysis.securityAnalysisStatus !== "FAIL" &&
      analysis.securityAnalysisStatus !== "NOT_RUN");

  const gateReasonLabels = formatGateReasons(analysis.gateReasons ?? []);

  return (
    <div className="mt-8 space-y-6">
      {/* Failed Analysis Banner */}
      {analysis.status === "FAILED" && (
        <div
          className="flex items-start gap-3 rounded-lg border p-4"
          style={{
            background: "var(--color-blocked-bg)",
            borderColor: "var(--color-blocked-border)",
          }}
          role="alert"
        >
          <AlertIcon
            className="mt-0.5 h-4 w-4 shrink-0"
            style={{ color: "var(--color-blocked)" }}
          />
          <div>
            <div className="text-label" style={{ color: "var(--color-blocked)" }}>
              Analysis Failed
            </div>
            <p className="mt-1 text-body" style={{ color: "var(--color-text-secondary)" }}>
              The analysis pipeline encountered an error. This is different from
              a BLOCKED deployment status.
            </p>
          </div>
        </div>
      )}

      {/* Incomplete Analysis Banner */}
      {analysis.status === "COMPLETED" && analysis.coverage === "PARTIAL" && (
        <div
          className="flex items-start gap-3 rounded-lg border p-4"
          style={{
            background: "var(--surface-secondary)",
            borderColor: "var(--border-default)",
          }}
          role="status"
        >
          <AlertIcon
            className="mt-0.5 h-4 w-4 shrink-0"
            style={{ color: "var(--color-medium)" }}
          />
          <div>
            <div className="text-label" style={{ color: "var(--color-medium)" }}>
              Incomplete Analysis
            </div>
            <p className="mt-1 text-body" style={{ color: "var(--color-text-secondary)" }}>
              Not all analysis stages completed successfully. Results may be partial.
            </p>
          </div>
        </div>
      )}

      {/* Security Summary */}
      {isTerminal && (
        <div className="surface-card p-6">
          <div className="text-label">Security Summary</div>
          <div className="mt-4 grid grid-cols-2 gap-6 sm:grid-cols-4">
            {/* Risk Score */}
            <div>
              <div className="text-label">Risk Score</div>
              <div className="mt-1">
                <RiskScore score={analysis.riskScore} />
              </div>
            </div>

            {/* Deployment Gate */}
            <div>
              <div className="text-label">Deployment Gate</div>
              <div className="mt-1">
                <DeploymentGate
                  status={analysis.deploymentStatus as "READY" | "BLOCKED" | null}
                  gateReasons={gateReasonLabels}
                />
              </div>
            </div>

            {/* Compilation */}
            <div>
              <div className="text-label">Compilation</div>
              <div className="mt-1 flex items-center gap-2">
                <MetricsCard
                  label=""
                  value={analysis.compilationStatus ?? "—"}
                  status={formatCompilationStatus(analysis.compilationStatus)}
                />
              </div>
            </div>

            {/* Tests */}
            <div>
              <div className="text-label">Tests</div>
              <div className="mt-1 flex items-center gap-2">
                <MetricsCard
                  label=""
                  value={formatTestStatus(analysis)}
                  status={formatTestStatusMetric(analysis)}
                />
              </div>
            </div>
          </div>

          {/* Metadata row */}
          <div className="mt-4 flex flex-wrap items-center gap-4 border-t pt-4" style={{ borderColor: "var(--color-border)" }}>
            <div className="text-body">
              <span className="font-semibold">{totalFindings}</span> finding{totalFindings !== 1 ? "s" : ""}
            </div>
            {duration && (
              <div className="text-metadata">Duration: {duration}</div>
            )}
            {analysis.projectType && (
              <div className="text-metadata">Type: {analysis.projectType}</div>
            )}
            {analysis.compilerVersion && (
              <div className="text-metadata">Compiler: solc {analysis.compilerVersion}</div>
            )}
            {analysis.coverage && (
              <div className="text-metadata">
                Coverage: {analysis.coverage}
              </div>
            )}
            <div className="text-metadata">
              {formatTimestamp(analysis.completedAt ?? analysis.createdAt)}
            </div>
          </div>

          {/* Gate reasons */}
          {gateReasonLabels.length > 0 && analysis.deploymentStatus === "BLOCKED" && (
            <div className="mt-3 border-t pt-3" style={{ borderColor: "var(--color-border)" }}>
              <div className="text-metadata font-medium" style={{ color: "var(--color-text-secondary)" }}>
                Blocking reasons:
              </div>
              <ul className="mt-1 list-inside list-disc text-metadata" style={{ color: "var(--color-text-muted)" }}>
                {gateReasonLabels.map((reason, i) => (
                  <li key={i}>{reason}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Severity Distribution */}
      {isTerminal && hasTrustworthyScan && totalFindings > 0 && (
        <div className="surface-card p-6">
          <div className="text-label">Severity Posture</div>
          <div className="mt-4">
            <SeverityBar severityCounts={severityCounts} total={totalFindings} />
          </div>
          <div className="mt-3 flex flex-wrap gap-4">
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full" style={{ background: "var(--color-critical)" }} />
              <span className="text-metadata">Critical: {severityCounts.CRITICAL}</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full" style={{ background: "var(--color-high)" }} />
              <span className="text-metadata">High: {severityCounts.HIGH}</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full" style={{ background: "var(--color-medium)" }} />
              <span className="text-metadata">Medium: {severityCounts.MEDIUM}</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full" style={{ background: "var(--color-low)" }} />
              <span className="text-metadata">Low: {severityCounts.LOW}</span>
            </div>
          </div>
        </div>
      )}

      {/* Scan failure notice */}
      {isTerminal && !hasTrustworthyScan && analysis.compilationStatus !== "FAIL" && (
        <div className="surface-card p-6">
          <div className="text-label">Static Analysis</div>
          <p className="mt-2 text-body" style={{ color: "var(--color-text-secondary)" }}>
            {analysis.securityAnalysisStatus === "FAIL"
              ? "Static analysis failed to complete. Findings may be incomplete."
              : analysis.securityAnalysisStatus === "NOT_RUN"
                ? "Static analysis was not executed."
                : analysis.securityAnalysisStatus === "NO_CONTRACTS_FOUND"
                  ? "No contracts were found to analyze."
                  : "Static analysis status unknown."}
          </p>
        </div>
      )}
    </div>
  );
}

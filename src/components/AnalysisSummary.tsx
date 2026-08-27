import { RiskScore } from "./RiskScore";
import { DeploymentGate } from "./DeploymentGate";
import { MetricsCard } from "./MetricsCard";

interface AnalysisSummaryProps {
  analysis: {
    id: string;
    status: string;
    riskScore: number | null;
    deploymentStatus: string | null;
    compilationStatus: string | null;
    testStatus: string | null;
    totalTests: number | null;
    passedTests: number | null;
    failedTests: number | null;
    startedAt: string | null;
    completedAt: string | null;
    createdAt: string;
    findings: Array<{
      id: string;
      severity: string;
    }>;
  };
}

function countBySeverity(findings: Array<{ severity: string }>) {
  const counts = { CRITICAL: 0, HIGH: 0, MEDIUM: 0, LOW: 0 };
  for (const f of findings) {
    if (f.severity in counts) {
      counts[f.severity as keyof typeof counts]++;
    }
  }
  return counts;
}

function formatDuration(startedAt: string | null, completedAt: string | null): string | null {
  if (!startedAt || !completedAt) return null;
  const ms = new Date(completedAt).getTime() - new Date(startedAt).getTime();
  const seconds = Math.round(ms / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  const remaining = seconds % 60;
  return remaining > 0 ? `${minutes}m ${remaining}s` : `${minutes}m`;
}

export function AnalysisSummary({ analysis }: AnalysisSummaryProps) {
  const severityCounts = countBySeverity(analysis.findings);
  const totalFindings = analysis.findings.length;
  const duration = formatDuration(analysis.startedAt, analysis.completedAt);

  const isTerminal = analysis.status === "COMPLETED" || analysis.status === "FAILED";

  return (
    <div className="mt-8 space-y-6">
      {analysis.status === "FAILED" && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-950">
          <div className="text-xs font-medium text-red-600 dark:text-red-400">
            ANALYSIS FAILED
          </div>
          <p className="mt-1 text-sm text-red-700 dark:text-red-300">
            The analysis pipeline encountered an error. This is different from a BLOCKED deployment status.
          </p>
        </div>
      )}

      {isTerminal && (
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-1 flex items-center justify-center">
            <RiskScore score={analysis.riskScore} />
          </div>
          <div className="lg:col-span-2">
            <DeploymentGate
              status={analysis.deploymentStatus as "READY" | "BLOCKED" | null}
            />
          </div>
        </div>
      )}

      {isTerminal && (
        <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
          <MetricsCard
            label="Compilation"
            value={analysis.compilationStatus ?? "—"}
            status={
              analysis.compilationStatus === "PASS"
                ? "pass"
                : analysis.compilationStatus === "FAIL"
                  ? "fail"
                  : "neutral"
            }
          />
          <MetricsCard
            label="Tests"
            value={
              analysis.totalTests !== null
                ? `${analysis.passedTests ?? 0}/${analysis.totalTests}`
                : "—"
            }
            status={
              analysis.testStatus === "PASS"
                ? "pass"
                : analysis.testStatus === "FAIL"
                  ? "fail"
                  : "neutral"
            }
          />
          <MetricsCard
            label="Findings"
            value={totalFindings}
          />
          <MetricsCard
            label="Critical"
            value={severityCounts.CRITICAL}
            accent={severityCounts.CRITICAL > 0 ? "red" : undefined}
          />
          <MetricsCard
            label="High"
            value={severityCounts.HIGH}
            accent={severityCounts.HIGH > 0 ? "orange" : undefined}
          />
          <MetricsCard
            label="Medium"
            value={severityCounts.MEDIUM}
            accent={severityCounts.MEDIUM > 0 ? "yellow" : undefined}
          />
        </div>
      )}

      {isTerminal && (
        <div className="flex flex-wrap gap-4 text-xs text-zinc-500 dark:text-zinc-400">
          <span>
            Created {new Date(analysis.createdAt).toLocaleString()}
          </span>
          {analysis.startedAt && (
            <span>
              Started {new Date(analysis.startedAt).toLocaleString()}
            </span>
          )}
          {analysis.completedAt && (
            <span>
              Completed {new Date(analysis.completedAt).toLocaleString()}
            </span>
          )}
          {duration && <span>Duration: {duration}</span>}
        </div>
      )}
    </div>
  );
}

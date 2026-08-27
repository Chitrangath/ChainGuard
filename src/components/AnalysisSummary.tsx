import { RiskScore } from "./RiskScore";
import { DeploymentGate } from "./DeploymentGate";
import { MetricsCard } from "./MetricsCard";
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

export function AnalysisSummary({ analysis }: AnalysisSummaryProps) {
  const severityCounts = countBySeverity(analysis.findings);
  const totalFindings = analysis.findings.length;
  const duration = formatDuration(analysis.startedAt, analysis.completedAt);
  const isTerminal =
    analysis.status === "COMPLETED" || analysis.status === "FAILED";

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
            <div
              className="text-xs font-semibold uppercase tracking-wide"
              style={{ color: "var(--color-blocked)" }}
            >
              Analysis Failed
            </div>
            <p
              className="mt-1 text-sm"
              style={{ color: "var(--text-secondary)" }}
            >
              The analysis pipeline encountered an error. This is different from
              a BLOCKED deployment status.
            </p>
          </div>
        </div>
      )}

      {/* Risk Score + Deployment Gate */}
      {isTerminal && (
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="surface-card flex items-center justify-center p-6 lg:col-span-1">
            <RiskScore score={analysis.riskScore} />
          </div>
          <div className="lg:col-span-2">
            <DeploymentGate
              status={analysis.deploymentStatus as "READY" | "BLOCKED" | null}
            />
          </div>
        </div>
      )}

      {/* Metrics Grid */}
      {isTerminal && (
        <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-7">
          <MetricsCard
            label="Compilation"
            value={analysis.compilationStatus ?? "\u2014"}
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
                : "\u2014"
            }
            status={
              analysis.testStatus === "PASS"
                ? "pass"
                : analysis.testStatus === "FAIL"
                  ? "fail"
                  : "neutral"
            }
          />
          <MetricsCard label="Findings" value={totalFindings} />
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
          <MetricsCard
            label="Low"
            value={severityCounts.LOW}
            accent={severityCounts.LOW > 0 ? "blue" : undefined}
          />
        </div>
      )}

      {/* Timestamps */}
      {isTerminal && (
        <div
          className="flex flex-wrap gap-4 border-t pt-4 text-xs"
          style={{
            borderColor: "var(--border-default)",
            color: "var(--text-muted)",
          }}
        >
          <span>Created {formatTimestamp(analysis.createdAt)}</span>
          {analysis.startedAt && (
            <span>Started {formatTimestamp(analysis.startedAt)}</span>
          )}
          {analysis.completedAt && (
            <span>Completed {formatTimestamp(analysis.completedAt)}</span>
          )}
          {duration && (
            <span className="font-medium">Duration: {duration}</span>
          )}
        </div>
      )}
    </div>
  );
}

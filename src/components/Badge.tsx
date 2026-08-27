const STATUS_STYLES: Record<string, string> = {
  QUEUED: "badge-queued",
  RUNNING: "badge-running",
  COMPLETED: "badge-ready",
  FAILED: "badge-blocked",
  READY: "badge-ready",
  BLOCKED: "badge-blocked",
  PASS: "badge-ready",
  FAIL: "badge-blocked",
};

const STATUS_LABELS: Record<string, string> = {
  QUEUED: "Queued",
  RUNNING: "Running",
  COMPLETED: "Completed",
  FAILED: "Failed",
  READY: "Ready",
  BLOCKED: "Blocked",
  PASS: "Pass",
  FAIL: "Fail",
};

interface StatusBadgeProps {
  status: string;
  className?: string;
}

export function StatusBadge({ status, className = "" }: StatusBadgeProps) {
  const style = STATUS_STYLES[status] ?? "badge-queued";
  const label = STATUS_LABELS[status] ?? status;

  return (
    <span className={`badge ${style} ${className}`} role="status">
      {label}
    </span>
  );
}

const SEVERITY_STYLES: Record<string, string> = {
  CRITICAL: "badge-critical",
  HIGH: "badge-high",
  MEDIUM: "badge-medium",
  LOW: "badge-low",
};

interface SeverityBadgeProps {
  severity: string;
  count?: number;
  className?: string;
}

export function SeverityBadge({ severity, count, className = "" }: SeverityBadgeProps) {
  const style = SEVERITY_STYLES[severity] ?? "badge-queued";
  const label = severity.charAt(0) + severity.slice(1).toLowerCase();

  return (
    <span className={`badge ${style} ${className}`}>
      {label}
      {count !== undefined && (
        <span className="ml-0.5 opacity-70">{count}</span>
      )}
    </span>
  );
}

interface DeploymentBadgeProps {
  status: string | null;
  className?: string;
}

export function DeploymentBadge({ status, className = "" }: DeploymentBadgeProps) {
  if (!status) return null;

  const style = status === "READY" ? "badge-ready" : "badge-blocked";
  const label = status === "READY" ? "Ready" : "Blocked";

  return (
    <span className={`badge ${style} ${className}`} role="status">
      {label}
    </span>
  );
}

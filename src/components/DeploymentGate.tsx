import { CheckIcon, XIcon } from "./icons";

interface DeploymentGateProps {
  status: "READY" | "BLOCKED" | null;
  gateReasons?: string[];
}

export function DeploymentGate({ status, gateReasons = [] }: DeploymentGateProps) {
  if (status === null) {
    return (
      <div className="surface-card p-4 text-center">
        <div className="text-label">Deployment Status</div>
        <div className="mt-2 text-metadata">No analysis completed</div>
      </div>
    );
  }

  const isReady = status === "READY";

  return (
    <div
      className="rounded-lg border p-4 text-center"
      style={{
        background: isReady ? "var(--color-ready-bg)" : "var(--color-blocked-bg)",
        borderColor: isReady ? "var(--color-ready-border)" : "var(--color-blocked-border)",
      }}
    >
      <div className="text-label" style={{ color: isReady ? "var(--color-ready)" : "var(--color-blocked)" }}>
        Deployment Status
      </div>
      <div className="mt-2 flex items-center justify-center gap-2">
        {isReady ? (
          <CheckIcon className="h-5 w-5" style={{ color: "var(--color-ready)" }} />
        ) : (
          <XIcon className="h-5 w-5" style={{ color: "var(--color-blocked)" }} />
        )}
        <span
          className="text-metric-sm"
          style={{ color: isReady ? "var(--color-ready)" : "var(--color-blocked)" }}
        >
          {status}
        </span>
      </div>
      {!isReady && gateReasons.length > 0 && (
        <div className="mt-2 text-metadata" style={{ color: "var(--color-text-muted)" }}>
          {gateReasons[0]}
        </div>
      )}
    </div>
  );
}

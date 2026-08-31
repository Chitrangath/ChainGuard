import { CheckIcon, XIcon, ShieldIcon } from "./icons";

interface SecurityPostureCardProps {
  readyCount: number;
  blockedCount: number;
  totalCount: number;
}

export function SecurityPostureCard({
  readyCount,
  blockedCount,
  totalCount,
}: SecurityPostureCardProps) {
  const total = readyCount + blockedCount;
  const readyPct = total > 0 ? Math.round((readyCount / total) * 100) : 0;
  const blockedPct = total > 0 ? Math.round((blockedCount / total) * 100) : 0;

  return (
    <div className="surface-card p-6">
      <div className="flex items-center gap-3">
        <div
          className="flex h-10 w-10 items-center justify-center rounded-lg"
          style={{ background: "var(--color-primary-muted)" }}
        >
          <ShieldIcon className="h-5 w-5" style={{ color: "var(--color-primary)" }} />
        </div>
        <div>
          <h3 className="heading-card">Security Posture</h3>
          <p className="text-metadata" style={{ color: "var(--color-text-muted)" }}>
            {totalCount} project{totalCount !== 1 ? "s" : ""} registered
          </p>
        </div>
      </div>

      {/* Posture rail */}
      <div className="mt-4">
        <div
          className="flex h-3 overflow-hidden rounded-full"
          style={{ background: "var(--color-surface-sunken)" }}
          role="img"
          aria-label={`${readyCount} ready, ${blockedCount} blocked`}
        >
          {readyCount > 0 && (
            <div
              className="transition-all"
              style={{
                width: `${readyPct}%`,
                background: "var(--color-ready)",
              }}
            />
          )}
          {blockedCount > 0 && (
            <div
              className="transition-all"
              style={{
                width: `${blockedPct}%`,
                background: "var(--color-blocked)",
              }}
            />
          )}
        </div>

        <div className="mt-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckIcon className="h-4 w-4" style={{ color: "var(--color-ready)" }} />
            <span className="text-body font-medium" style={{ color: "var(--color-ready)" }}>
              {readyCount} Ready
            </span>
          </div>
          <div className="flex items-center gap-2">
            <XIcon className="h-4 w-4" style={{ color: "var(--color-blocked)" }} />
            <span className="text-body font-medium" style={{ color: "var(--color-blocked)" }}>
              {blockedCount} Blocked
            </span>
          </div>
        </div>
      </div>

      <p
        className="mt-4 text-metadata"
        style={{ color: "var(--color-text-muted)", lineHeight: 1.5 }}
      >
        {blockedCount > 0
          ? `${blockedCount} project${blockedCount !== 1 ? "s" : ""} require attention before deployment.`
          : readyCount > 0
            ? "All analyzed projects are cleared for deployment."
            : "No deployment decisions yet. Run an analysis to evaluate readiness."}
      </p>
    </div>
  );
}

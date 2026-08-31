interface RiskScoreProps {
  score: number | null;
  size?: "sm" | "lg";
}

function getScoreColor(score: number): string {
  if (score >= 80) return "var(--color-ready)";
  if (score >= 60) return "var(--color-medium)";
  if (score >= 40) return "var(--color-high)";
  return "var(--color-critical)";
}

function getScoreLabel(score: number): string {
  if (score >= 80) return "Low Risk";
  if (score >= 60) return "Medium Risk";
  if (score >= 40) return "High Risk";
  return "Critical Risk";
}

export function RiskScore({ score, size = "lg" }: RiskScoreProps) {
  if (score === null) {
    return (
      <div className="text-center">
        <div
          className={size === "lg" ? "text-metric" : "text-metric-sm"}
          style={{ color: "var(--color-text-muted)" }}
        >
          —
        </div>
        <div className="mt-1 text-metadata">No score</div>
      </div>
    );
  }

  const color = getScoreColor(score);
  const label = getScoreLabel(score);

  return (
    <div className="text-center">
      <div
        className={size === "lg" ? "text-metric" : "text-metric-sm"}
        style={{ color }}
      >
        {score}
      </div>
      <div className="text-metadata">/100</div>
      {size === "lg" && (
        <div className="mt-1 text-label" style={{ color }}>
          {label}
        </div>
      )}
    </div>
  );
}

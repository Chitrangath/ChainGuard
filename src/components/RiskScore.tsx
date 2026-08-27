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
          className={size === "lg" ? "text-4xl" : "text-lg"}
          style={{ color: "var(--text-muted)" }}
        >
          &mdash;
        </div>
        <div
          className="mt-1 text-xs"
          style={{ color: "var(--text-muted)" }}
        >
          No score
        </div>
      </div>
    );
  }

  const color = getScoreColor(score);
  const label = getScoreLabel(score);

  return (
    <div className="text-center">
      <div
        className={`${size === "lg" ? "text-5xl" : "text-xl"} font-bold tracking-tight`}
        style={{ color }}
      >
        {score}
      </div>
      <div
        className={`${size === "lg" ? "text-sm" : "text-xs"} mt-0.5`}
        style={{ color: "var(--text-muted)" }}
      >
        /100
      </div>
      {size === "lg" && (
        <div
          className="mt-1 text-xs font-medium"
          style={{ color }}
        >
          {label}
        </div>
      )}
    </div>
  );
}

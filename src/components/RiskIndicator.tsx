interface RiskIndicatorProps {
  score: number;
  size?: "sm" | "md";
}

function riskLabel(score: number): string {
  if (score >= 80) return "Low risk";
  if (score >= 60) return "Medium risk";
  if (score >= 40) return "High risk";
  return "Critical risk";
}

function riskColor(score: number): string {
  if (score >= 80) return "var(--color-ready)";
  if (score >= 60) return "var(--color-medium)";
  if (score >= 40) return "var(--color-high)";
  return "var(--color-critical)";
}

function riskTrackColor(score: number): string {
  if (score >= 80) return "var(--color-ready-bg)";
  if (score >= 60) return "var(--color-medium-bg)";
  if (score >= 40) return "var(--color-high-bg)";
  return "var(--color-blocked-bg)";
}

export function RiskIndicator({ score, size = "sm" }: RiskIndicatorProps) {
  const color = riskColor(score);
  const trackColor = riskTrackColor(score);
  const label = riskLabel(score);
  const r = size === "sm" ? 14 : 20;
  const stroke = size === "sm" ? 3 : 4;
  const circumference = 2 * Math.PI * r;
  const filled = (score / 100) * circumference;
  const fontSize = size === "sm" ? "text-code text-xs" : "text-code text-sm";

  return (
    <div
      className="inline-flex items-center gap-2"
      role="img"
      aria-label={`Risk score ${score} out of 100, ${label}`}
    >
      <div className="relative" style={{ width: r * 2 + stroke, height: r * 2 + stroke }}>
        <svg
          width={r * 2 + stroke}
          height={r * 2 + stroke}
          viewBox={`0 0 ${r * 2 + stroke} ${r * 2 + stroke}`}
          aria-hidden="true"
        >
          <circle
            cx={r + stroke / 2}
            cy={r + stroke / 2}
            r={r}
            fill="none"
            stroke={trackColor}
            strokeWidth={stroke}
          />
          <circle
            cx={r + stroke / 2}
            cy={r + stroke / 2}
            r={r}
            fill="none"
            stroke={color}
            strokeWidth={stroke}
            strokeDasharray={`${circumference}`}
            strokeDashoffset={circumference - filled}
            strokeLinecap="round"
            transform={`rotate(-90 ${r + stroke / 2} ${r + stroke / 2})`}
          />
        </svg>
        <div
          className="absolute inset-0 flex items-center justify-center"
          style={{ color }}
        >
          <span className={`${fontSize} font-bold`}>{score}</span>
        </div>
      </div>
      <span className="text-metadata" style={{ color: "var(--color-text-muted)" }}>{label}</span>
    </div>
  );
}

interface RiskScoreProps {
  score: number | null;
  size?: "sm" | "lg";
}

function getScoreColor(score: number): string {
  if (score >= 80) return "text-green-600 dark:text-green-400";
  if (score >= 60) return "text-yellow-600 dark:text-yellow-400";
  if (score >= 40) return "text-orange-600 dark:text-orange-400";
  return "text-red-600 dark:text-red-400";
}

export function RiskScore({ score, size = "lg" }: RiskScoreProps) {
  if (score === null) {
    return (
      <div className="text-zinc-400 dark:text-zinc-500">
        {size === "lg" ? "No score" : "—"}
      </div>
    );
  }

  const colorClass = getScoreColor(score);
  const sizeClass = size === "lg" ? "text-4xl" : "text-lg";

  return (
    <div className="text-center">
      <div className={`${sizeClass} font-bold ${colorClass}`}>{score}</div>
      <div className="text-xs text-zinc-500 dark:text-zinc-400">/100</div>
    </div>
  );
}

interface MetricsCardProps {
  label: string;
  value: string | number;
  status?: "pass" | "fail" | "neutral";
  accent?: "red" | "orange" | "yellow" | "green" | "blue";
}

function accentBorderClass(accent: string | undefined): string {
  switch (accent) {
    case "red":
      return "border-l-red-500 dark:border-l-red-400";
    case "orange":
      return "border-l-orange-500 dark:border-l-orange-400";
    case "yellow":
      return "border-l-yellow-500 dark:border-l-yellow-400";
    case "green":
      return "border-l-green-500 dark:border-l-green-400";
    case "blue":
      return "border-l-blue-500 dark:border-l-blue-400";
    default:
      return "";
  }
}

export function MetricsCard({ label, value, status = "neutral", accent }: MetricsCardProps) {
  const statusIcon =
    status === "pass" ? (
      <span className="text-green-600 dark:text-green-400">&#10003;</span>
    ) : status === "fail" ? (
      <span className="text-red-600 dark:text-red-400">&#10007;</span>
    ) : null;

  const borderClass = accentBorderClass(accent);

  return (
    <div className={`rounded-lg border border-zinc-200 bg-white p-3 dark:border-zinc-800 dark:bg-zinc-900 ${borderClass ? `border-l-2 ${borderClass}` : ""}`}>
      <div className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
        {label}
      </div>
      <div className="mt-1 flex items-center gap-1.5">
        {statusIcon}
        <span className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
          {value}
        </span>
      </div>
    </div>
  );
}

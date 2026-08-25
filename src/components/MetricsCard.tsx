interface MetricsCardProps {
  label: string;
  value: string | number;
  status?: "pass" | "fail" | "neutral";
}

export function MetricsCard({ label, value, status = "neutral" }: MetricsCardProps) {
  const statusIcon =
    status === "pass" ? (
      <span className="text-green-600 dark:text-green-400">&#10003;</span>
    ) : status === "fail" ? (
      <span className="text-red-600 dark:text-red-400">&#10007;</span>
    ) : null;

  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-3 dark:border-zinc-800 dark:bg-zinc-900">
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

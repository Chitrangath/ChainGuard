interface DeploymentGateProps {
  status: "READY" | "BLOCKED" | null;
}

export function DeploymentGate({ status }: DeploymentGateProps) {
  if (status === null) {
    return (
      <div className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
        <div className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
          DEPLOYMENT STATUS
        </div>
        <div className="mt-1 text-sm text-zinc-400 dark:text-zinc-500">
          No analysis completed
        </div>
      </div>
    );
  }

  const isReady = status === "READY";

  return (
    <div
      className={`rounded-lg border p-4 ${
        isReady
          ? "border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950"
          : "border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950"
      }`}
    >
      <div className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
        DEPLOYMENT STATUS
      </div>
      <div
        className={`mt-1 text-lg font-bold ${
          isReady
            ? "text-green-700 dark:text-green-300"
            : "text-red-700 dark:text-red-300"
        }`}
      >
        {isReady ? "\u2713 READY" : "\u2717 BLOCKED"}
      </div>
    </div>
  );
}

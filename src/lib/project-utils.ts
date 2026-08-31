export function extractRepoDisplay(url: string): string {
  try {
    const parts = new URL(url).pathname.split("/").filter(Boolean);
    if (parts.length >= 2) return `${parts[0]}/${parts[1]}`;
    return url;
  } catch {
    return url;
  }
}

export function lifecycleLabel(status: string | undefined): string {
  if (!status) return "Not analyzed";
  switch (status) {
    case "QUEUED": return "Queued";
    case "RUNNING": return "Running";
    case "COMPLETED": return "Completed";
    case "FAILED": return "Failed";
    default: return status;
  }
}

export function deploymentLabel(status: string | null | undefined): string {
  if (!status) return "—";
  switch (status) {
    case "READY": return "Ready";
    case "BLOCKED": return "Blocked";
    default: return status;
  }
}

export function deploymentBadgeClass(status: string | null | undefined): string {
  if (status === "READY") return "badge badge-ready";
  if (status === "BLOCKED") return "badge badge-blocked";
  return "";
}

export function lifecycleBadgeClass(status: string | undefined): string {
  if (status === "QUEUED") return "badge badge-queued";
  if (status === "RUNNING") return "badge badge-running";
  if (status === "COMPLETED") return "badge badge-ready";
  if (status === "FAILED") return "badge badge-blocked";
  return "badge badge-unavailable";
}

export function riskColor(score: number): string {
  if (score >= 80) return "var(--color-ready)";
  if (score >= 60) return "var(--color-medium)";
  if (score >= 40) return "var(--color-high)";
  return "var(--color-critical)";
}

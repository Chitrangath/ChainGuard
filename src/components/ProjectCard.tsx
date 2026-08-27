import Link from "next/link";

interface ProjectCardProps {
  id: string;
  name: string;
  repositoryUrl: string;
  description?: string | null;
  latestRiskScore?: number | null;
  latestDeploymentStatus?: string | null;
  lastAnalysisDate?: string | null;
  activeStatus?: string | null;
  createdAt: string;
}

export function ProjectCard({
  id,
  name,
  repositoryUrl,
  description,
  latestRiskScore,
  latestDeploymentStatus,
  lastAnalysisDate,
  activeStatus,
  createdAt,
}: ProjectCardProps) {
  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-4 transition-colors hover:border-zinc-300 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-zinc-700">
      <div className="flex items-start justify-between">
        <div className="space-y-1 min-w-0 flex-1">
          <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
            {name}
          </h3>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 truncate max-w-xs">
            {repositoryUrl}
          </p>
          {description && (
            <p className="text-sm text-zinc-600 dark:text-zinc-300 line-clamp-2">{description}</p>
          )}
        </div>
        <div className="text-right ml-3 shrink-0">
          {latestRiskScore !== null && latestRiskScore !== undefined ? (
            <div className="text-lg font-bold text-zinc-900 dark:text-zinc-100">
              {latestRiskScore}
              <span className="text-xs font-normal text-zinc-500">/100</span>
            </div>
          ) : (
            <div className="text-sm text-zinc-400">No analysis</div>
          )}
          {latestDeploymentStatus && (
            <span
              className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${
                latestDeploymentStatus === "READY"
                  ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                  : "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
              }`}
            >
              {latestDeploymentStatus}
            </span>
          )}
        </div>
      </div>
      <div className="mt-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          {activeStatus ? (
            <span
              className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${
                activeStatus === "QUEUED"
                  ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200"
                  : "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
              }`}
            >
              {activeStatus === "QUEUED" ? "Queued" : "Analyzing"}
            </span>
          ) : lastAnalysisDate ? (
            <span className="text-xs text-zinc-400 dark:text-zinc-500">
              Last analysis {new Date(lastAnalysisDate).toLocaleDateString()}
            </span>
          ) : (
            <span className="text-xs text-zinc-400 dark:text-zinc-500">
              Created {new Date(createdAt).toLocaleDateString()}
            </span>
          )}
        </div>
        <Link
          href={`/projects/${id}`}
          className="text-sm font-medium text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
        >
          View
        </Link>
      </div>
    </div>
  );
}

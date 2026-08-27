import Link from "next/link";
import { ExternalLinkIcon } from "./icons";
import { StatusBadge, DeploymentBadge } from "./Badge";

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

function getRiskColor(score: number): string {
  if (score >= 80) return "var(--color-ready)";
  if (score >= 60) return "var(--color-medium)";
  if (score >= 40) return "var(--color-high)";
  return "var(--color-critical)";
}

function formatRelativeDate(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
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
  const repoDisplay = repositoryUrl.replace(
    /^https:\/\/github\.com\//,
    "",
  );

  return (
    <Link
      href={`/projects/${id}`}
      className="surface-card block p-4 transition-all hover:shadow-md focus-ring group"
      style={{
        borderColor: "var(--border-default)",
      }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h3
            className="truncate text-sm font-semibold group-hover:underline"
            style={{ color: "var(--text-primary)" }}
          >
            {name}
          </h3>
          <div
            className="mt-0.5 flex items-center gap-1 text-xs"
            style={{ color: "var(--text-muted)" }}
          >
            <span className="truncate">{repoDisplay}</span>
            <ExternalLinkIcon className="h-3 w-3 shrink-0 opacity-50" />
          </div>
          {description && (
            <p
              className="mt-1.5 line-clamp-2 text-xs leading-relaxed"
              style={{ color: "var(--text-secondary)" }}
            >
              {description}
            </p>
          )}
        </div>

        <div className="flex shrink-0 flex-col items-end gap-1.5">
          {latestRiskScore !== null && latestRiskScore !== undefined ? (
            <div className="text-right">
              <div
                className="text-xl font-bold"
                style={{ color: getRiskColor(latestRiskScore) }}
              >
                {latestRiskScore}
              </div>
              <div
                className="text-[10px] font-medium uppercase tracking-wide"
                style={{ color: "var(--text-muted)" }}
              >
                /100
              </div>
            </div>
          ) : (
            <div
              className="text-xs"
              style={{ color: "var(--text-muted)" }}
            >
              No analysis
            </div>
          )}
          {latestDeploymentStatus && (
            <DeploymentBadge status={latestDeploymentStatus} />
          )}
        </div>
      </div>

      <div
        className="mt-3 flex items-center justify-between border-t pt-3"
        style={{ borderColor: "var(--border-default)" }}
      >
        <div>
          {activeStatus ? (
            <StatusBadge status={activeStatus} />
          ) : lastAnalysisDate ? (
            <span
              className="text-xs"
              style={{ color: "var(--text-muted)" }}
            >
              Analyzed {formatRelativeDate(lastAnalysisDate)}
            </span>
          ) : (
            <span
              className="text-xs"
              style={{ color: "var(--text-muted)" }}
            >
              Created {formatRelativeDate(createdAt)}
            </span>
          )}
        </div>
        <span
          className="text-xs font-medium opacity-0 transition-opacity group-hover:opacity-100"
          style={{ color: "var(--text-secondary)" }}
        >
          View &rarr;
        </span>
      </div>
    </Link>
  );
}

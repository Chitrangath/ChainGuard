import Link from "next/link";
import { db } from "@/lib/db";
import { ProjectCard } from "@/components/ProjectCard";
import { ShieldIcon, PlusIcon } from "@/components/icons";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  let projects: Array<{
    id: string;
    name: string;
    repositoryUrl: string;
    description: string | null;
    createdAt: string;
    updatedAt: string;
    latestRiskScore: number | null;
    latestDeploymentStatus: string | null;
    lastAnalysisDate: string | null;
    activeStatus: string | null;
  }> = [];
  let dbError = false;
  let totalProjects = 0;
  let analyzingCount = 0;
  let readyCount = 0;
  let blockedCount = 0;

  try {
    const raw = await db.project.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        analyses: {
          orderBy: { createdAt: "desc" },
          take: 1,
        },
        _count: {
          select: {
            analyses: {
              where: { status: { in: ["QUEUED", "RUNNING"] } },
            },
          },
        },
      },
    });

    totalProjects = raw.length;

    const projectIds = raw.map((p) => p.id);
    const activeAnalyses = await db.analysis.findMany({
      where: {
        projectId: { in: projectIds },
        status: { in: ["QUEUED", "RUNNING"] },
      },
      select: {
        projectId: true,
        status: true,
      },
    });

    const activeStatusMap = new Map<string, string>();
    for (const a of activeAnalyses) {
      activeStatusMap.set(a.projectId, a.status);
    }

    projects = raw.map((p) => {
      const latestAnalysis = p.analyses[0];
      if (latestAnalysis?.deploymentStatus === "READY") readyCount++;
      if (latestAnalysis?.deploymentStatus === "BLOCKED") blockedCount++;
      if (activeStatusMap.has(p.id)) analyzingCount++;

      return {
        id: p.id,
        name: p.name,
        repositoryUrl: p.repositoryUrl,
        description: p.description,
        createdAt: p.createdAt.toISOString(),
        updatedAt: p.updatedAt.toISOString(),
        latestRiskScore: latestAnalysis?.riskScore ?? null,
        latestDeploymentStatus: latestAnalysis?.deploymentStatus ?? null,
        lastAnalysisDate: latestAnalysis?.createdAt?.toISOString() ?? null,
        activeStatus: activeStatusMap.get(p.id) ?? null,
      };
    });
  } catch (error) {
    if (
      error instanceof Error &&
      (error.message.includes("ECONNREFUSED") ||
        error.message.includes("connect"))
    ) {
      dbError = false;
    } else {
      dbError = true;
    }
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2.5">
            <ShieldIcon
              className="h-6 w-6"
              style={{ color: "var(--text-primary)" }}
            />
            <h1
              className="text-2xl font-bold tracking-tight"
              style={{ color: "var(--text-primary)" }}
            >
              Projects
            </h1>
          </div>
          <p
            className="mt-1 text-sm"
            style={{ color: "var(--text-secondary)" }}
          >
            Smart contract security analysis dashboard
          </p>
        </div>
        <Link
          href="/projects/new"
          className="btn btn-primary focus-ring"
        >
          <PlusIcon className="h-4 w-4" />
          New Project
        </Link>
      </div>

      {/* Summary Metrics */}
      {totalProjects > 0 && (
        <div
          className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4"
        >
          <SummaryMetric label="Total Projects" value={totalProjects} />
          <SummaryMetric
            label="Analyzing"
            value={analyzingCount}
            color="var(--color-running)"
          />
          <SummaryMetric
            label="Ready"
            value={readyCount}
            color="var(--color-ready)"
          />
          <SummaryMetric
            label="Blocked"
            value={blockedCount}
            color="var(--color-blocked)"
          />
        </div>
      )}

      {/* Error State */}
      {dbError && (
        <div
          className="mt-6 rounded-lg border p-6 text-center"
          style={{
            background: "var(--color-blocked-bg)",
            borderColor: "var(--color-blocked-border)",
          }}
        >
          <p
            className="text-sm font-medium"
            style={{ color: "var(--color-blocked)" }}
          >
            Unable to load projects
          </p>
          <p
            className="mt-1 text-sm"
            style={{ color: "var(--text-secondary)" }}
          >
            Please check your database connection and try again.
          </p>
        </div>
      )}

      {/* Project Grid */}
      {!dbError && (
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {projects.length > 0 ? (
            projects.map((project) => (
              <ProjectCard
                key={project.id}
                id={project.id}
                name={project.name}
                repositoryUrl={project.repositoryUrl}
                description={project.description}
                latestRiskScore={project.latestRiskScore}
                latestDeploymentStatus={project.latestDeploymentStatus}
                lastAnalysisDate={project.lastAnalysisDate}
                activeStatus={project.activeStatus}
                createdAt={project.createdAt}
              />
            ))
          ) : (
            <EmptyState />
          )}
        </div>
      )}
    </div>
  );
}

function SummaryMetric({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color?: string;
}) {
  return (
    <div className="surface-card p-3">
      <div
        className="text-xs font-medium uppercase tracking-wide"
        style={{ color: "var(--text-muted)" }}
      >
        {label}
      </div>
      <div
        className="mt-1 text-2xl font-bold"
        style={{ color: color ?? "var(--text-primary)" }}
      >
        {value}
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="col-span-full py-16 text-center">
      <ShieldIcon
        className="mx-auto h-12 w-12"
        style={{ color: "var(--text-muted)" }}
      />
      <h3
        className="mt-3 text-sm font-semibold"
        style={{ color: "var(--text-primary)" }}
      >
        No projects yet
      </h3>
      <p
        className="mt-1 text-sm"
        style={{ color: "var(--text-secondary)" }}
      >
        Create a project to start analyzing your Solidity smart contracts for
        security vulnerabilities.
      </p>
      <div className="mt-5">
        <Link
          href="/projects/new"
          className="btn btn-primary focus-ring"
        >
          <PlusIcon className="h-4 w-4" />
          Create Project
        </Link>
      </div>
    </div>
  );
}

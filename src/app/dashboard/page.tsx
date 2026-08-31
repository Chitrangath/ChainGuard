import Link from "next/link";
import { db } from "@/lib/db";
import { PlusIcon } from "@/components/icons";
import { ProjectExplorer } from "@/components/ProjectExplorer";
import { SecurityPostureCard } from "@/components/SecurityPostureCard";

export const dynamic = "force-dynamic";

interface ProjectSummary {
  id: string;
  name: string;
  repositoryUrl: string;
  description: string | null;
  createdAt: Date;
  analyses: {
    id: string;
    status: string;
    riskScore: number | null;
    deploymentStatus: string | null;
    createdAt: Date;
  }[];
}

export default async function DashboardPage() {
  let projects: ProjectSummary[] = [];
  let dbError = false;

  try {
    projects = await db.project.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        analyses: {
          orderBy: { createdAt: "desc" },
          take: 1,
          select: {
            id: true,
            status: true,
            riskScore: true,
            deploymentStatus: true,
            createdAt: true,
          },
        },
      },
    });
  } catch {
    dbError = true;
  }

  const totalCount = projects.length;
  const readyCount = projects.filter((p) =>
    p.analyses.some((a) => a.status === "COMPLETED" && a.deploymentStatus === "READY")
  ).length;
  const blockedCount = projects.filter((p) =>
    p.analyses.some((a) => a.status === "COMPLETED" && a.deploymentStatus === "BLOCKED")
  ).length;

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="heading-page">Security Overview</h1>
          <p className="mt-1 text-body" style={{ color: "var(--color-text-secondary)" }}>
            Automated analysis for your Solidity projects
          </p>
        </div>
        <Link className="btn btn-primary focus-ring" href="/projects/new">
          <PlusIcon className="h-4 w-4" />
          New Project
        </Link>
      </div>

      {dbError ? (
        <div
          className="mt-6 rounded-lg border p-6 text-center"
          role="alert"
          style={{
            background: "var(--color-blocked-bg)",
            borderColor: "var(--color-blocked-border)",
          }}
        >
          <p className="text-body font-medium" style={{ color: "var(--color-destructive)" }}>
            Unable to load projects
          </p>
          <p className="mt-1 text-metadata" style={{ color: "var(--color-text-secondary)" }}>
            Please check your database connection and try again.
          </p>
        </div>
      ) : (
        <>
          {/* Security posture card */}
          <div className="mt-6">
            <SecurityPostureCard
              readyCount={readyCount}
              blockedCount={blockedCount}
              totalCount={totalCount}
            />
          </div>

          {/* Project table surface */}
          <div className="mt-8">
            <h2 className="heading-section">Projects</h2>
          </div>

          {projects.length === 0 ? (
            <div className="mt-6 surface-card p-12 text-center">
              <PlusIcon className="mx-auto h-10 w-10" style={{ color: "var(--color-text-muted)" }} />
              <h3 className="heading-card mt-4">No projects yet</h3>
              <p className="mt-2 text-metadata" style={{ color: "var(--color-text-secondary)" }}>
                Create your first project to start automated security analysis.
              </p>
              <Link className="btn btn-primary mt-4 focus-ring" href="/projects/new">
                <PlusIcon className="h-4 w-4" />
                Create Project
              </Link>
            </div>
          ) : (
            <ProjectExplorer projects={projects} />
          )}
        </>
      )}
    </div>
  );
}

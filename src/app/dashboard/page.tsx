import Link from "next/link";
import { db } from "@/lib/db";
import { ProjectCard } from "@/components/ProjectCard";

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
  }> = [];

  try {
    const raw = await db.project.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        analyses: {
          orderBy: { createdAt: "desc" },
          take: 1,
        },
      },
    });

    projects = raw.map((p) => ({
      id: p.id,
      name: p.name,
      repositoryUrl: p.repositoryUrl,
      description: p.description,
      createdAt: p.createdAt.toISOString(),
      updatedAt: p.updatedAt.toISOString(),
      latestRiskScore: p.analyses[0]?.riskScore ?? null,
      latestDeploymentStatus: p.analyses[0]?.deploymentStatus ?? null,
    }));
  } catch {
    // Database may not be available; show empty state
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
          Projects
        </h1>
        <Link
          href="/projects/new"
          className="inline-flex items-center rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
        >
          + New Project
        </Link>
      </div>
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
              createdAt={project.createdAt}
            />
          ))
        ) : (
          <div className="col-span-full rounded-lg border border-dashed border-zinc-300 p-12 text-center dark:border-zinc-700">
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              No projects yet. Create one to get started.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

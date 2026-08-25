import { notFound } from "next/navigation";
import Link from "next/link";
import { db } from "@/lib/db";
import { RiskScore } from "@/components/RiskScore";
import { DeploymentGate } from "@/components/DeploymentGate";
import { MetricsCard } from "@/components/MetricsCard";
import { FindingTable } from "@/components/FindingTable";
import { AnalysisControls } from "@/components/AnalysisControls";

export const dynamic = "force-dynamic";

export default async function ProjectPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  let project: {
    id: string;
    name: string;
    repositoryUrl: string;
    description: string | null;
    createdAt: string;
    latestAnalysis: {
      id: string;
      status: string;
      riskScore: number | null;
      deploymentStatus: string | null;
      compilationStatus: string | null;
      testStatus: string | null;
      totalTests: number | null;
      passedTests: number | null;
      failedTests: number | null;
      createdAt: string;
      findings: Array<{
        id: string;
        severity: string;
        type: string;
        contract: string | null;
        file: string | null;
        line: number | null;
        description: string;
        source: string;
      }>;
    } | null;
    analysisHistory: Array<{
      id: string;
      status: string;
      riskScore: number | null;
      deploymentStatus: string | null;
      createdAt: string;
    }>;
  } | null = null;

  try {
    const raw = await db.project.findUnique({
      where: { id },
      include: {
        analyses: {
          orderBy: { createdAt: "desc" },
          include: { findings: true },
        },
      },
    });

    if (!raw) {
      notFound();
    }

    const [latest, ...history] = raw.analyses;

    project = {
      id: raw.id,
      name: raw.name,
      repositoryUrl: raw.repositoryUrl,
      description: raw.description,
      createdAt: raw.createdAt.toISOString(),
      latestAnalysis: latest
        ? {
            id: latest.id,
            status: latest.status,
            riskScore: latest.riskScore,
            deploymentStatus: latest.deploymentStatus,
            compilationStatus: latest.compilationStatus,
            testStatus: latest.testStatus,
            totalTests: latest.totalTests,
            passedTests: latest.passedTests,
            failedTests: latest.failedTests,
            createdAt: latest.createdAt.toISOString(),
            findings: latest.findings.map((f) => ({
              id: f.id,
              severity: f.severity,
              type: f.type,
              contract: f.contract,
              file: f.file,
              line: f.line,
              description: f.description,
              source: f.source,
            })),
          }
        : null,
      analysisHistory: history.map((a) => ({
        id: a.id,
        status: a.status,
        riskScore: a.riskScore,
        deploymentStatus: a.deploymentStatus,
        createdAt: a.createdAt.toISOString(),
      })),
    };
  } catch {
    notFound();
  }

  if (!project) {
    notFound();
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <div className="mb-6">
        <Link
          href="/dashboard"
          className="text-sm text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
        >
          &larr; Back to Dashboard
        </Link>
      </div>

      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
            {project.name}
          </h1>
          <a
            href={project.repositoryUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-1 block text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 font-mono"
          >
            {project.repositoryUrl}
          </a>
          {project.description && (
            <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
              {project.description}
            </p>
          )}
          <p className="mt-1 text-xs text-zinc-400 dark:text-zinc-500">
            Created {new Date(project.createdAt).toLocaleDateString()}
          </p>
        </div>
        <AnalysisControls
          projectId={project.id}
          latestAnalysis={
            project.latestAnalysis
              ? { id: project.latestAnalysis.id, status: project.latestAnalysis.status }
              : null
          }
        />
      </div>

      {project.latestAnalysis &&
      project.latestAnalysis.status !== "QUEUED" &&
      project.latestAnalysis.status !== "RUNNING" ? (
        <>
          <div className="mt-8 grid gap-6 lg:grid-cols-3">
            <div className="lg:col-span-1 flex items-center justify-center">
              <RiskScore score={project.latestAnalysis.riskScore} />
            </div>
            <div className="lg:col-span-2">
              <DeploymentGate
                status={project.latestAnalysis.deploymentStatus as "READY" | "BLOCKED" | null}
              />
            </div>
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <MetricsCard
              label="Compilation"
              value={project.latestAnalysis.compilationStatus ?? "—"}
              status={
                project.latestAnalysis.compilationStatus === "PASS"
                  ? "pass"
                  : project.latestAnalysis.compilationStatus === "FAIL"
                    ? "fail"
                    : "neutral"
              }
            />
            <MetricsCard
              label="Tests"
              value={
                project.latestAnalysis.totalTests !== null
                  ? `${project.latestAnalysis.passedTests ?? 0}/${project.latestAnalysis.totalTests}`
                  : "—"
              }
              status={
                project.latestAnalysis.testStatus === "PASS"
                  ? "pass"
                  : project.latestAnalysis.testStatus === "FAIL"
                    ? "fail"
                    : "neutral"
              }
            />
            <MetricsCard
              label="Findings"
              value={project.latestAnalysis.findings.length}
            />
            <MetricsCard
              label="Risk Score"
              value={
                project.latestAnalysis.riskScore !== null
                  ? `${project.latestAnalysis.riskScore}/100`
                  : "—"
              }
            />
          </div>

          <div className="mt-8">
            <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
              Findings
            </h2>
            <div className="mt-3">
              <FindingTable findings={project.latestAnalysis.findings} />
            </div>
          </div>
        </>
      ) : project.latestAnalysis &&
        (project.latestAnalysis.status === "QUEUED" ||
          project.latestAnalysis.status === "RUNNING") ? (
        <div className="mt-8 rounded-lg border border-blue-200 bg-blue-50 p-8 text-center dark:border-blue-800 dark:bg-blue-950">
          <p className="text-sm text-blue-700 dark:text-blue-300">
            Analysis is {project.latestAnalysis.status.toLowerCase()}...
            Security scanning will be implemented in Phase 4.
          </p>
        </div>
      ) : (
        <div className="mt-8 rounded-lg border border-dashed border-zinc-300 p-8 text-center dark:border-zinc-700">
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            No analysis yet. Run your first analysis to see results here.
          </p>
        </div>
      )}

      <div className="mt-8">
        <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
          Analysis History
        </h2>
        {project.analysisHistory.length > 0 ? (
          <div className="mt-3 space-y-2">
            {project.analysisHistory.map((analysis) => (
              <div
                key={analysis.id}
                className="flex items-center justify-between rounded-lg border border-zinc-200 bg-white px-4 py-3 dark:border-zinc-800 dark:bg-zinc-900"
              >
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                    Analysis
                  </span>
                  <span
                    className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${
                      analysis.status === "COMPLETED"
                        ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                        : analysis.status === "FAILED"
                          ? "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
                          : "bg-zinc-100 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-200"
                    }`}
                  >
                    {analysis.status}
                  </span>
                </div>
                <div className="flex items-center gap-4">
                  {analysis.riskScore !== null && (
                    <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                      {analysis.riskScore}/100
                    </span>
                  )}
                  {analysis.deploymentStatus && (
                    <span
                      className={`text-xs font-medium ${
                        analysis.deploymentStatus === "READY"
                          ? "text-green-600 dark:text-green-400"
                          : "text-red-600 dark:text-red-400"
                      }`}
                    >
                      {analysis.deploymentStatus}
                    </span>
                  )}
                  <span className="text-xs text-zinc-400 dark:text-zinc-500">
                    {new Date(analysis.createdAt).toLocaleDateString()}
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
            No analyses yet.
          </p>
        )}
      </div>
    </div>
  );
}

import { notFound } from "next/navigation";
import Link from "next/link";
import { db } from "@/lib/db";
import { AnalysisView } from "@/components/AnalysisView";

export const dynamic = "force-dynamic";

export default async function ProjectPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ analysisId?: string }>;
}) {
  const { id } = await params;
  const { analysisId } = await searchParams;

  let project: {
    id: string;
    name: string;
    repositoryUrl: string;
    description: string | null;
    createdAt: string;
  } | null = null;

  try {
    const raw = await db.project.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        repositoryUrl: true,
        description: true,
        createdAt: true,
      },
    });

    if (!raw) {
      notFound();
    }

    project = {
      id: raw.id,
      name: raw.name,
      repositoryUrl: raw.repositoryUrl,
      description: raw.description,
      createdAt: raw.createdAt.toISOString(),
    };
  } catch {
    notFound();
  }

  if (!project) {
    notFound();
  }

  // Query 1: Active analysis (QUEUED/RUNNING) — lightweight, no findings
  const activeAnalysis = await db.analysis.findFirst({
    where: {
      projectId: id,
      status: { in: ["QUEUED", "RUNNING"] },
    },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      status: true,
      createdAt: true,
    },
  });

  // Query 2: Bounded history page (10 items) — summaries only with finding counts
  const historyAnalyses = await db.analysis.findMany({
    where: { projectId: id },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: 10,
    select: {
      id: true,
      status: true,
      riskScore: true,
      deploymentStatus: true,
      compilationStatus: true,
      testStatus: true,
      totalTests: true,
      passedTests: true,
      failedTests: true,
      startedAt: true,
      completedAt: true,
      createdAt: true,
      _count: { select: { findings: true } },
    },
  });

  const totalAnalyses = await db.analysis.count({
    where: { projectId: id },
  });

  // Query 3: Selected analysis with findings (if analysisId provided)
  let selectedAnalysis: {
    id: string;
    status: string;
    riskScore: number | null;
    deploymentStatus: string | null;
    compilationStatus: string | null;
    testStatus: string | null;
    totalTests: number | null;
    passedTests: number | null;
    failedTests: number | null;
    startedAt: string | null;
    completedAt: string | null;
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
  } | null = null;

  if (analysisId) {
    const selRaw = await db.analysis.findFirst({
      where: { id: analysisId, projectId: id },
      include: {
        findings: {
          orderBy: [
            { severity: "asc" },
            { file: "asc" },
            { line: "asc" },
            { id: "asc" },
          ],
        },
      },
    });

    if (selRaw) {
      selectedAnalysis = {
        id: selRaw.id,
        status: selRaw.status,
        riskScore: selRaw.riskScore,
        deploymentStatus: selRaw.deploymentStatus,
        compilationStatus: selRaw.compilationStatus,
        testStatus: selRaw.testStatus,
        totalTests: selRaw.totalTests,
        passedTests: selRaw.passedTests,
        failedTests: selRaw.failedTests,
        startedAt: selRaw.startedAt?.toISOString() ?? null,
        completedAt: selRaw.completedAt?.toISOString() ?? null,
        createdAt: selRaw.createdAt.toISOString(),
        findings: selRaw.findings.map((f) => ({
          id: f.id,
          severity: f.severity,
          type: f.type,
          contract: f.contract,
          file: f.file,
          line: f.line,
          description: f.description,
          source: f.source,
        })),
      };
    }
  }

  // If no selected analysis, use the first history entry (latest completed or active)
  if (!selectedAnalysis && historyAnalyses.length > 0) {
    const latest = historyAnalyses[0];
    // Only load findings for the latest if it's completed
    if (latest.status === "COMPLETED" || latest.status === "FAILED") {
      const latestWithFindings = await db.analysis.findUnique({
        where: { id: latest.id },
        include: {
          findings: {
            orderBy: [
              { severity: "asc" },
              { file: "asc" },
              { line: "asc" },
              { id: "asc" },
            ],
          },
        },
      });

      if (latestWithFindings) {
        selectedAnalysis = {
          id: latestWithFindings.id,
          status: latestWithFindings.status,
          riskScore: latestWithFindings.riskScore,
          deploymentStatus: latestWithFindings.deploymentStatus,
          compilationStatus: latestWithFindings.compilationStatus,
          testStatus: latestWithFindings.testStatus,
          totalTests: latestWithFindings.totalTests,
          passedTests: latestWithFindings.passedTests,
          failedTests: latestWithFindings.failedTests,
          startedAt: latestWithFindings.startedAt?.toISOString() ?? null,
          completedAt: latestWithFindings.completedAt?.toISOString() ?? null,
          createdAt: latestWithFindings.createdAt.toISOString(),
          findings: latestWithFindings.findings.map((f) => ({
            id: f.id,
            severity: f.severity,
            type: f.type,
            contract: f.contract,
            file: f.file,
            line: f.line,
            description: f.description,
            source: f.source,
          })),
        };
      }
    } else {
      // Active analysis — no findings to show
      selectedAnalysis = {
        id: latest.id,
        status: latest.status,
        riskScore: null,
        deploymentStatus: null,
        compilationStatus: null,
        testStatus: null,
        totalTests: null,
        passedTests: null,
        failedTests: null,
        startedAt: null,
        completedAt: null,
        createdAt: latest.createdAt.toISOString(),
        findings: [],
      };
    }
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

      <AnalysisView
        project={project}
        activeAnalysis={activeAnalysis
          ? { ...activeAnalysis, createdAt: activeAnalysis.createdAt.toISOString() }
          : null}
        selectedAnalysis={selectedAnalysis}
        historyAnalyses={historyAnalyses.map((a) => ({
          id: a.id,
          status: a.status,
          riskScore: a.riskScore,
          deploymentStatus: a.deploymentStatus,
          compilationStatus: a.compilationStatus,
          testStatus: a.testStatus,
          totalTests: a.totalTests,
          passedTests: a.passedTests,
          failedTests: a.failedTests,
          startedAt: a.startedAt?.toISOString() ?? null,
          completedAt: a.completedAt?.toISOString() ?? null,
          createdAt: a.createdAt.toISOString(),
          findingCount: a._count.findings,
        }))}
        totalAnalyses={totalAnalyses}
        selectedAnalysisId={analysisId ?? null}
      />
    </div>
  );
}

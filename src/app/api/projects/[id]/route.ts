import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { handleApiError } from "@/lib/api-error";
import { presentAnalysisSignals, presentEvidence } from "@/lib/evidence";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;

    const project = await db.project.findUnique({
      where: { id },
      include: {
        analyses: {
          orderBy: { createdAt: "desc" },
          include: {
            findings: true,
          },
        },
      },
    });

    if (!project) {
      return NextResponse.json(
        { error: "Project not found" },
        { status: 404 },
      );
    }

    const [latest, ...history] = project.analyses;
    const latestEvidence = latest
      ? presentEvidence(latest.evidenceVersion, latest.riskScore, latest.deploymentStatus)
      : null;
    const latestSignals = latest
      ? presentAnalysisSignals(latest.evidenceVersion, {
          compilationStatus: latest.compilationStatus,
          testStatus: latest.testStatus,
          totalTests: latest.totalTests,
          passedTests: latest.passedTests,
          failedTests: latest.failedTests,
          findingCount: latest.findings.length,
        })
      : null;

    return NextResponse.json({
      id: project.id,
      name: project.name,
      repositoryUrl: project.repositoryUrl,
      description: project.description,
      createdAt: project.createdAt.toISOString(),
      updatedAt: project.updatedAt.toISOString(),
      latestAnalysis: latest
        ? {
            id: latest.id,
            status: latest.status,
            riskScore: latestEvidence?.riskScore ?? null,
            deploymentStatus: latestEvidence?.deploymentStatus ?? null,
            evidenceStatus: latestEvidence?.evidenceStatus,
            compilationStatus: latestSignals?.compilationStatus ?? null,
            testStatus: latestSignals?.testStatus ?? null,
            totalTests: latestSignals?.totalTests ?? null,
            passedTests: latestSignals?.passedTests ?? null,
            failedTests: latestSignals?.failedTests ?? null,
            findingCount: latestSignals?.findingCount ?? null,
            startedAt: latest.startedAt?.toISOString() ?? null,
            completedAt: latest.completedAt?.toISOString() ?? null,
            createdAt: latest.createdAt.toISOString(),
            findings: latestEvidence?.evidenceStatus === "VERIFIED" ? latest.findings.map((f) => ({
              id: f.id,
              severity: f.severity,
              type: f.type,
              contract: f.contract,
              file: f.file,
              line: f.line,
              description: f.description,
              source: f.source,
              scope: f.scope,
            })) : [],
          }
        : null,
      analysisHistory: history.map((a) => ({
        id: a.id,
        status: a.status,
        ...presentEvidence(a.evidenceVersion, a.riskScore, a.deploymentStatus),
        createdAt: a.createdAt.toISOString(),
      })),
    });
  } catch (error) {
    return handleApiError(error);
  }
}

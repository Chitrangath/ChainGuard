import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { handleApiError } from "@/lib/api-error";

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
            riskScore: latest.riskScore,
            deploymentStatus: latest.deploymentStatus,
            compilationStatus: latest.compilationStatus,
            testStatus: latest.testStatus,
            totalTests: latest.totalTests,
            passedTests: latest.passedTests,
            failedTests: latest.failedTests,
            startedAt: latest.startedAt?.toISOString() ?? null,
            completedAt: latest.completedAt?.toISOString() ?? null,
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
    });
  } catch (error) {
    return handleApiError(error);
  }
}

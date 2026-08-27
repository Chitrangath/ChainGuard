import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { handleApiError } from "@/lib/api-error";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; analysisId: string }> },
) {
  try {
    const { id, analysisId } = await params;

    const analysis = await db.analysis.findFirst({
      where: {
        id: analysisId,
        projectId: id,
      },
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

    if (!analysis) {
      return NextResponse.json(
        { error: "Analysis not found" },
        { status: 404 },
      );
    }

    return NextResponse.json({
      id: analysis.id,
      status: analysis.status,
      riskScore: analysis.riskScore,
      deploymentStatus: analysis.deploymentStatus,
      compilationStatus: analysis.compilationStatus,
      testStatus: analysis.testStatus,
      totalTests: analysis.totalTests,
      passedTests: analysis.passedTests,
      failedTests: analysis.failedTests,
      startedAt: analysis.startedAt?.toISOString() ?? null,
      completedAt: analysis.completedAt?.toISOString() ?? null,
      createdAt: analysis.createdAt.toISOString(),
      findings: analysis.findings.map((f) => ({
        id: f.id,
        severity: f.severity,
        type: f.type,
        contract: f.contract,
        file: f.file,
        line: f.line,
        description: f.description,
        source: f.source,
      })),
    });
  } catch (error) {
    return handleApiError(error);
  }
}

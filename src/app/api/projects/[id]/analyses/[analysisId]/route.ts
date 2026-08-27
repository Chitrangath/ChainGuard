import { NextRequest, NextResponse } from "next/server";
import { getAnalysisWithFindings } from "@/lib/analysis-service";
import { handleApiError } from "@/lib/api-error";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; analysisId: string }> },
) {
  try {
    const { id, analysisId } = await params;

    const analysis = await getAnalysisWithFindings(analysisId, id);

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
      startedAt: analysis.startedAt,
      completedAt: analysis.completedAt,
      createdAt: analysis.createdAt,
      findings: analysis.findings,
    });
  } catch (error) {
    return handleApiError(error);
  }
}

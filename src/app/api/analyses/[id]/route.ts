import { NextRequest, NextResponse } from "next/server";
import { getAnalysisById } from "@/lib/analysis-service";
import { handleApiError } from "@/lib/api-error";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;

    const analysis = await getAnalysisById(id);

    if (!analysis) {
      return NextResponse.json(
        { error: "Analysis not found" },
        { status: 404 },
      );
    }

    return NextResponse.json({
      id: analysis.id,
      projectId: analysis.projectId,
      status: analysis.status,
      riskScore: analysis.riskScore,
      deploymentStatus: analysis.deploymentStatus,
      compilationStatus: analysis.compilationStatus,
      testStatus: analysis.testStatus,
      totalTests: analysis.totalTests,
      passedTests: analysis.passedTests,
      failedTests: analysis.failedTests,
      findingCount: analysis.findingCount,
      startedAt: analysis.startedAt,
      completedAt: analysis.completedAt,
      createdAt: analysis.createdAt,
    });
  } catch (error) {
    return handleApiError(error);
  }
}

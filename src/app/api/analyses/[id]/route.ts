import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { handleApiError } from "@/lib/api-error";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;

    const analysis = await db.analysis.findUnique({
      where: { id },
      include: {
        findings: {
          select: { id: true },
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
      projectId: analysis.projectId,
      status: analysis.status,
      riskScore: analysis.riskScore,
      deploymentStatus: analysis.deploymentStatus,
      compilationStatus: analysis.compilationStatus,
      testStatus: analysis.testStatus,
      totalTests: analysis.totalTests,
      passedTests: analysis.passedTests,
      failedTests: analysis.failedTests,
      findingCount: analysis.findings.length,
      startedAt: analysis.startedAt?.toISOString() ?? null,
      completedAt: analysis.completedAt?.toISOString() ?? null,
      createdAt: analysis.createdAt.toISOString(),
    });
  } catch (error) {
    return handleApiError(error);
  }
}

import { NextRequest, NextResponse } from "next/server";
import { getAnalysisWithFindings } from "@/lib/analysis-service";
import { handleApiError } from "@/lib/api-error";
import { findingPaginationSchema } from "@/lib/validation";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; analysisId: string }> },
) {
  try {
    const { id, analysisId } = await params;
    const searchParams = new URL(request.url).searchParams;
    const parsed = findingPaginationSchema.safeParse({
      page: searchParams.get("page") ?? undefined,
      pageSize: searchParams.get("pageSize") ?? undefined,
      severity: searchParams.get("severity") ?? undefined,
    });
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid finding pagination parameters" }, { status: 400 });
    }

    const analysis = await getAnalysisWithFindings(analysisId, id, parsed.data);

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
      findingsPagination: analysis.findingsPagination,
      projectType: analysis.projectType,
      compilerVersion: analysis.compilerVersion,
      contractsDiscovered: analysis.contractsDiscovered,
      contractsCompiled: analysis.contractsCompiled,
      contractsTargetedForScan: analysis.contractsTargetedForScan,
      securityAnalysisStatus: analysis.securityAnalysisStatus,
      gateReasons: analysis.gateReasons,
      coverage: analysis.coverage,
      evidenceStatus: analysis.evidenceStatus,
      firstPartySourcesDiscovered: analysis.firstPartySourcesDiscovered,
      dependencySourcesDiscovered: analysis.dependencySourcesDiscovered,
      generatedSourcesDiscovered: analysis.generatedSourcesDiscovered,
      firstPartySourcesTargeted: analysis.firstPartySourcesTargeted,
      filesScanned: analysis.filesScanned,
      sourcesRejected: analysis.sourcesRejected,
      discoveryReasons: analysis.discoveryReasons,
      failureReason: analysis.failureReason,
      attemptCount: analysis.attemptCount,
      lastAttemptAt: analysis.lastAttemptAt,
      nextAttemptAt: analysis.nextAttemptAt,
      lastSafeReason: analysis.lastSafeReason,
      terminalReason: analysis.terminalReason,
      projectRootsDiscovered: analysis.projectRootsDiscovered,
      projectRootsAnalyzed: analysis.projectRootsAnalyzed,
    });
  } catch (error) {
    return handleApiError(error);
  }
}

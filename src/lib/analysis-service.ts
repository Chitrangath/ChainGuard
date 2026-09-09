import { db } from "./db";
import {
  getCachedAnalysis,
  setCachedAnalysis,
  isTerminal,
  type CachedAnalysis,
} from "./analysis-cache";
import { presentEvidence, type EvidenceStatus } from "./evidence";

export interface AnalysisResult {
  id: string;
  projectId: string;
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
  findingCount: number;
  projectType: string | null;
  compilerVersion: string | null;
  contractsDiscovered: number | null;
  contractsCompiled: number | null;
  contractsTargetedForScan: number | null;
  securityAnalysisStatus: string | null;
  gateReasons: string[];
  coverage: string | null;
  evidenceStatus: EvidenceStatus;
  firstPartySourcesDiscovered: number | null;
  dependencySourcesDiscovered: number | null;
  generatedSourcesDiscovered: number | null;
  firstPartySourcesTargeted: number | null;
  filesScanned: number | null;
  sourcesRejected: number | null;
  discoveryReasons: string[];
  failureReason: string | null;
}

export interface AnalysisDetailResult extends AnalysisResult {
  findings: Array<{
    id: string;
    severity: string;
    type: string;
    contract: string | null;
    file: string | null;
    line: number | null;
    description: string;
    source: string;
    scope: string;
  }>;
}

function mapAnalysisToResult(
  analysis: {
    id: string;
    projectId: string;
    status: string;
    riskScore: number | null;
    deploymentStatus: string | null;
    compilationStatus: string | null;
    testStatus: string | null;
    totalTests: number | null;
    passedTests: number | null;
    failedTests: number | null;
    startedAt: Date | null;
    completedAt: Date | null;
    createdAt: Date;
    projectType?: string | null;
    compilerVersion?: string | null;
    contractsDiscovered?: number | null;
    contractsCompiled?: number | null;
    contractsTargetedForScan?: number | null;
    securityAnalysisStatus?: string | null;
    gateReasons?: string[];
    coverage?: string | null;
    evidenceVersion?: number | null;
    firstPartySourcesDiscovered?: number | null;
    dependencySourcesDiscovered?: number | null;
    generatedSourcesDiscovered?: number | null;
    firstPartySourcesTargeted?: number | null;
    filesScanned?: number | null;
    sourcesRejected?: number | null;
    discoveryReasons?: string[];
    failureReason?: string | null;
    findings?: Array<{ id: string }>;
  },
  findingCount?: number,
): AnalysisResult {
  const presented = presentEvidence(
    analysis.evidenceVersion,
    analysis.riskScore,
    analysis.deploymentStatus,
  );
  const legacy = presented.evidenceStatus === "LEGACY_UNVERIFIED";
  return {
    id: analysis.id,
    projectId: analysis.projectId,
    status: analysis.status,
    riskScore: presented.riskScore,
    deploymentStatus: presented.deploymentStatus,
    compilationStatus: legacy ? null : analysis.compilationStatus,
    testStatus: legacy ? null : analysis.testStatus,
    totalTests: legacy ? null : analysis.totalTests,
    passedTests: legacy ? null : analysis.passedTests,
    failedTests: legacy ? null : analysis.failedTests,
    startedAt: analysis.startedAt?.toISOString() ?? null,
    completedAt: analysis.completedAt?.toISOString() ?? null,
    createdAt: analysis.createdAt.toISOString(),
    findingCount: findingCount ?? analysis.findings?.length ?? 0,
    projectType: legacy ? null : analysis.projectType ?? null,
    compilerVersion: legacy ? null : analysis.compilerVersion ?? null,
    contractsDiscovered: legacy ? null : analysis.contractsDiscovered ?? null,
    contractsCompiled: legacy ? null : analysis.contractsCompiled ?? null,
    contractsTargetedForScan: legacy ? null : analysis.contractsTargetedForScan ?? null,
    securityAnalysisStatus: legacy ? null : analysis.securityAnalysisStatus ?? null,
    gateReasons: legacy ? ["INCOMPLETE_ANALYSIS"] : analysis.gateReasons ?? [],
    coverage: legacy ? null : analysis.coverage ?? null,
    evidenceStatus: presented.evidenceStatus,
    firstPartySourcesDiscovered: analysis.firstPartySourcesDiscovered ?? null,
    dependencySourcesDiscovered: analysis.dependencySourcesDiscovered ?? null,
    generatedSourcesDiscovered: analysis.generatedSourcesDiscovered ?? null,
    firstPartySourcesTargeted: analysis.firstPartySourcesTargeted ?? null,
    filesScanned: analysis.filesScanned ?? null,
    sourcesRejected: analysis.sourcesRejected ?? null,
    discoveryReasons: analysis.discoveryReasons ?? [],
    failureReason: analysis.failureReason ?? null,
  };
}

function cachedToResult(cached: CachedAnalysis): AnalysisResult {
  const legacy = cached.evidenceStatus === "LEGACY_UNVERIFIED";
  return {
    id: cached.id,
    projectId: cached.projectId,
    status: cached.status,
    riskScore: cached.riskScore,
    deploymentStatus: cached.deploymentStatus,
    compilationStatus: legacy ? null : cached.compilationStatus,
    testStatus: legacy ? null : cached.testStatus,
    totalTests: legacy ? null : cached.totalTests,
    passedTests: legacy ? null : cached.passedTests,
    failedTests: legacy ? null : cached.failedTests,
    startedAt: cached.startedAt,
    completedAt: cached.completedAt,
    createdAt: cached.createdAt,
    findingCount: cached.findings.length,
    projectType: legacy ? null : cached.projectType ?? null,
    compilerVersion: legacy ? null : cached.compilerVersion ?? null,
    contractsDiscovered: legacy ? null : cached.contractsDiscovered ?? null,
    contractsCompiled: legacy ? null : cached.contractsCompiled ?? null,
    contractsTargetedForScan: legacy ? null : cached.contractsTargetedForScan ?? null,
    securityAnalysisStatus: legacy ? null : cached.securityAnalysisStatus ?? null,
    gateReasons: legacy ? ["INCOMPLETE_ANALYSIS"] : cached.gateReasons ?? [],
    coverage: legacy ? null : cached.coverage ?? null,
    evidenceStatus: cached.evidenceStatus,
    firstPartySourcesDiscovered: cached.firstPartySourcesDiscovered ?? null,
    dependencySourcesDiscovered: cached.dependencySourcesDiscovered ?? null,
    generatedSourcesDiscovered: cached.generatedSourcesDiscovered ?? null,
    firstPartySourcesTargeted: cached.firstPartySourcesTargeted ?? null,
    filesScanned: cached.filesScanned ?? null,
    sourcesRejected: cached.sourcesRejected ?? null,
    discoveryReasons: cached.discoveryReasons ?? [],
    failureReason: cached.failureReason ?? null,
  };
}

function cachedToDetail(cached: CachedAnalysis): AnalysisDetailResult {
  return {
    ...cachedToResult(cached),
    findings: cached.findings,
  };
}

export async function getAnalysisById(
  analysisId: string,
  projectId?: string,
): Promise<AnalysisResult | null> {
  const cached = await getCachedAnalysis(analysisId);
  if (cached && isTerminal(cached.status)) {
    if (projectId && cached.projectId !== projectId) return null;
    return cachedToResult(cached);
  }

  const analysis = await db.analysis.findUnique({
    where: { id: analysisId },
    include: { findings: { select: { id: true } } },
  });

  if (!analysis) return null;
  if (projectId && analysis.projectId !== projectId) return null;

  return mapAnalysisToResult(analysis);
}

export async function getAnalysisWithFindings(
  analysisId: string,
  projectId: string,
): Promise<AnalysisDetailResult | null> {
  const cached = await getCachedAnalysis(analysisId);
  if (cached && isTerminal(cached.status)) {
    if (cached.projectId !== projectId) return null;
    return cachedToDetail(cached);
  }

  const analysis = await db.analysis.findFirst({
    where: { id: analysisId, projectId },
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

  if (!analysis) return null;

  const result: AnalysisDetailResult = {
    ...mapAnalysisToResult(analysis),
    findings: analysis.findings.map((f) => ({
      id: f.id,
      severity: f.severity,
      type: f.type,
      contract: f.contract,
      file: f.file,
      line: f.line,
      description: f.description,
      source: f.source,
      scope: f.scope,
    })),
  };

  if (isTerminal(analysis.status)) {
    const cacheData: CachedAnalysis = {
      id: result.id,
      projectId: result.projectId,
      status: result.status,
      riskScore: result.riskScore,
      deploymentStatus: result.deploymentStatus,
      compilationStatus: result.compilationStatus,
      testStatus: result.testStatus,
      totalTests: result.totalTests,
      passedTests: result.passedTests,
      failedTests: result.failedTests,
      startedAt: result.startedAt,
      completedAt: result.completedAt,
      createdAt: result.createdAt,
      findings: result.findings,
      projectType: result.projectType,
      compilerVersion: result.compilerVersion,
      contractsDiscovered: result.contractsDiscovered,
      contractsCompiled: result.contractsCompiled,
      contractsTargetedForScan: result.contractsTargetedForScan,
      securityAnalysisStatus: result.securityAnalysisStatus,
      gateReasons: result.gateReasons,
      coverage: result.coverage,
      evidenceVersion: analysis.evidenceVersion,
      evidenceStatus: result.evidenceStatus,
      firstPartySourcesDiscovered: result.firstPartySourcesDiscovered,
      dependencySourcesDiscovered: result.dependencySourcesDiscovered,
      generatedSourcesDiscovered: result.generatedSourcesDiscovered,
      firstPartySourcesTargeted: result.firstPartySourcesTargeted,
      filesScanned: result.filesScanned,
      sourcesRejected: result.sourcesRejected,
      discoveryReasons: result.discoveryReasons,
      failureReason: result.failureReason,
    };
    await setCachedAnalysis(analysisId, cacheData);
  }

  return result;
}

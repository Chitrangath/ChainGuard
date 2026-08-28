import { db } from "./db";
import {
  getCachedAnalysis,
  setCachedAnalysis,
  isTerminal,
  type CachedAnalysis,
} from "./analysis-cache";

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
    findings?: Array<{ id: string }>;
  },
  findingCount?: number,
): AnalysisResult {
  return {
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
    startedAt: analysis.startedAt?.toISOString() ?? null,
    completedAt: analysis.completedAt?.toISOString() ?? null,
    createdAt: analysis.createdAt.toISOString(),
    findingCount: findingCount ?? analysis.findings?.length ?? 0,
    projectType: analysis.projectType ?? null,
    compilerVersion: analysis.compilerVersion ?? null,
    contractsDiscovered: analysis.contractsDiscovered ?? null,
    contractsCompiled: analysis.contractsCompiled ?? null,
    contractsTargetedForScan: analysis.contractsTargetedForScan ?? null,
    securityAnalysisStatus: analysis.securityAnalysisStatus ?? null,
    gateReasons: analysis.gateReasons ?? [],
    coverage: analysis.coverage ?? null,
  };
}

function cachedToResult(cached: CachedAnalysis): AnalysisResult {
  return {
    id: cached.id,
    projectId: cached.projectId,
    status: cached.status,
    riskScore: cached.riskScore,
    deploymentStatus: cached.deploymentStatus,
    compilationStatus: cached.compilationStatus,
    testStatus: cached.testStatus,
    totalTests: cached.totalTests,
    passedTests: cached.passedTests,
    failedTests: cached.failedTests,
    startedAt: cached.startedAt,
    completedAt: cached.completedAt,
    createdAt: cached.createdAt,
    findingCount: cached.findings.length,
    projectType: cached.projectType ?? null,
    compilerVersion: cached.compilerVersion ?? null,
    contractsDiscovered: cached.contractsDiscovered ?? null,
    contractsCompiled: cached.contractsCompiled ?? null,
    contractsTargetedForScan: cached.contractsTargetedForScan ?? null,
    securityAnalysisStatus: cached.securityAnalysisStatus ?? null,
    gateReasons: cached.gateReasons ?? [],
    coverage: cached.coverage ?? null,
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
    };
    await setCachedAnalysis(analysisId, cacheData);
  }

  return result;
}

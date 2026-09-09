import { db } from "./db";
import {
  getCachedAnalysis,
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
  attemptCount: number;
  lastAttemptAt: string | null;
  nextAttemptAt: string | null;
  lastSafeReason: string | null;
  terminalReason: string | null;
  projectRootsDiscovered: number | null;
  projectRootsAnalyzed: number | null;
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
  findingsPagination: { page: number; pageSize: number; total: number; totalPages: number; severity: string | null };
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
    attemptCount?: number;
    lastAttemptAt?: Date | null;
    nextAttemptAt?: Date | null;
    lastSafeReason?: string | null;
    terminalReason?: string | null;
    projectRootsDiscovered?: number | null;
    projectRootsAnalyzed?: number | null;
    findings?: Array<{ id: string }>;
    _count?: { findings: number };
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
    findingCount: findingCount ?? analysis._count?.findings ?? analysis.findings?.length ?? 0,
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
    attemptCount: analysis.attemptCount ?? 0,
    lastAttemptAt: analysis.lastAttemptAt?.toISOString() ?? null,
    nextAttemptAt: analysis.nextAttemptAt?.toISOString() ?? null,
    lastSafeReason: analysis.lastSafeReason ?? null,
    terminalReason: analysis.terminalReason ?? null,
    projectRootsDiscovered: analysis.projectRootsDiscovered ?? null,
    projectRootsAnalyzed: analysis.projectRootsAnalyzed ?? null,
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
    attemptCount: cached.attemptCount ?? 0,
    lastAttemptAt: cached.lastAttemptAt ?? null,
    nextAttemptAt: cached.nextAttemptAt ?? null,
    lastSafeReason: cached.lastSafeReason ?? null,
    terminalReason: cached.terminalReason ?? null,
    projectRootsDiscovered: cached.projectRootsDiscovered ?? null,
    projectRootsAnalyzed: cached.projectRootsAnalyzed ?? null,
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
    include: { _count: { select: { findings: true } } },
  });

  if (!analysis) return null;
  if (projectId && analysis.projectId !== projectId) return null;

  return mapAnalysisToResult(analysis);
}

export async function getAnalysisWithFindings(
  analysisId: string,
  projectId: string,
  options: { page?: number; pageSize?: number; severity?: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW" } = {},
): Promise<AnalysisDetailResult | null> {
  const analysis = await db.analysis.findFirst({
    where: { id: analysisId, projectId },
  });

  if (!analysis) return null;
  const page = options.page ?? 1;
  const pageSize = options.pageSize ?? 25;
  const findingWhere = { analysisId, ...(options.severity ? { severity: options.severity } : {}) };
  const [findings, total] = await Promise.all([
    db.finding.findMany({
      where: findingWhere,
      orderBy: [{ severity: "asc" }, { file: "asc" }, { line: "asc" }, { id: "asc" }],
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    db.finding.count({ where: findingWhere }),
  ]);

  const result: AnalysisDetailResult = {
    ...mapAnalysisToResult(analysis, total),
    findings: findings.map((f) => ({
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
    findingsPagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize), severity: options.severity ?? null },
  };
  return result;
}

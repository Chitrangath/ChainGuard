export const CURRENT_EVIDENCE_VERSION = 2;

export type EvidenceStatus = "VERIFIED" | "LEGACY_UNVERIFIED";

export function evidenceStatus(version: number | null | undefined): EvidenceStatus {
  return version === CURRENT_EVIDENCE_VERSION ? "VERIFIED" : "LEGACY_UNVERIFIED";
}

export function presentEvidence(
  version: number | null | undefined,
  riskScore: number | null,
  deploymentStatus: string | null,
) {
  const status = evidenceStatus(version);
  return {
    evidenceStatus: status,
    riskScore: status === "VERIFIED" ? riskScore : null,
    deploymentStatus: status === "VERIFIED" ? deploymentStatus : "BLOCKED",
  };
}

export function presentAnalysisSignals<T extends {
  compilationStatus: string | null;
  testStatus: string | null;
  totalTests: number | null;
  passedTests: number | null;
  failedTests: number | null;
  findingCount: number;
}>(version: number | null | undefined, signals: T) {
  if (evidenceStatus(version) === "VERIFIED") return signals;
  return {
    ...signals,
    compilationStatus: null,
    testStatus: null,
    totalTests: null,
    passedTests: null,
    failedTests: null,
    findingCount: null,
  };
}

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

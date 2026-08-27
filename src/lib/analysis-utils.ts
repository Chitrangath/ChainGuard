export interface SeverityCounts {
  CRITICAL: number;
  HIGH: number;
  MEDIUM: number;
  LOW: number;
}

export interface FindingData {
  id: string;
  severity: string;
  type: string;
  contract: string | null;
  file: string | null;
  line: number | null;
  description: string;
  source: string;
}

export interface AnalysisData {
  id: string;
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
  findings: FindingData[];
}

export interface AnalysisSummaryData {
  id: string;
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
}

export function countBySeverity(findings: Array<{ severity: string }>): SeverityCounts {
  const counts: SeverityCounts = { CRITICAL: 0, HIGH: 0, MEDIUM: 0, LOW: 0 };
  for (const f of findings) {
    if (f.severity in counts) {
      counts[f.severity as keyof SeverityCounts]++;
    }
  }
  return counts;
}

export const SEVERITY_ORDER = ["CRITICAL", "HIGH", "MEDIUM", "LOW"] as const;

export type Severity = typeof SEVERITY_ORDER[number];

export function sortFindingsBySeverity<T extends { severity: string; file: string | null; line: number | null; id: string }>(
  findings: T[],
): T[] {
  return [...findings].sort((a, b) => {
    const aIdx = SEVERITY_ORDER.indexOf(a.severity as Severity);
    const bIdx = SEVERITY_ORDER.indexOf(b.severity as Severity);
    const severityDiff = aIdx - bIdx;
    if (severityDiff !== 0) return severityDiff;
    if (a.file && b.file) {
      const fileDiff = a.file.localeCompare(b.file);
      if (fileDiff !== 0) return fileDiff;
    }
    if (a.line !== null && b.line !== null) {
      const lineDiff = a.line - b.line;
      if (lineDiff !== 0) return lineDiff;
    }
    if (a.id < b.id) return -1;
    if (a.id > b.id) return 1;
    return 0;
  });
}

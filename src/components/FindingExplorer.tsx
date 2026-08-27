"use client";

import { useState, useMemo } from "react";
import { findingFilterSchema } from "@/lib/validation";

interface Finding {
  id: string;
  severity: string;
  type: string;
  contract: string | null;
  file: string | null;
  line: number | null;
  description: string;
  source: string;
}

interface FindingExplorerProps {
  findings: Finding[];
  analysisStatus: string;
}

const SEVERITY_ORDER = ["CRITICAL", "HIGH", "MEDIUM", "LOW"] as const;

const SEVERITY_FILTERS = [
  { label: "All", value: "ALL" },
  { label: "Critical", value: "CRITICAL" },
  { label: "High", value: "HIGH" },
  { label: "Medium", value: "MEDIUM" },
  { label: "Low", value: "LOW" },
] as const;

const SEVERITY_BADGE_CLASSES: Record<string, string> = {
  CRITICAL: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
  HIGH: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
  MEDIUM: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
  LOW: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
};

function sortFindings(findings: Finding[]): Finding[] {
  return [...findings].sort((a, b) => {
    const aIdx = SEVERITY_ORDER.indexOf(a.severity as typeof SEVERITY_ORDER[number]);
    const bIdx = SEVERITY_ORDER.indexOf(b.severity as typeof SEVERITY_ORDER[number]);
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

function countBySeverity(findings: Finding[]) {
  const counts = { CRITICAL: 0, HIGH: 0, MEDIUM: 0, LOW: 0 };
  for (const f of findings) {
    if (f.severity in counts) {
      counts[f.severity as keyof typeof counts]++;
    }
  }
  return counts;
}

export function FindingExplorer({ findings, analysisStatus }: FindingExplorerProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [severityFilter, setSeverityFilter] = useState("ALL");

  const severityCounts = useMemo(() => countBySeverity(findings), [findings]);

  const filteredFindings = useMemo(() => {
    const sorted = sortFindings(findings);
    if (severityFilter === "ALL") return sorted;
    const result = findingFilterSchema.safeParse({ severity: severityFilter });
    if (!result.success) return sorted;
    return sorted.filter((f) => f.severity === result.data.severity);
  }, [findings, severityFilter]);

  const toggleExpanded = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
  };

  if (analysisStatus === "FAILED") {
    return (
      <div className="mt-8">
        <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
          Findings
        </h2>
        <p className="mt-3 text-sm text-zinc-500 dark:text-zinc-400">
          Findings are unavailable because the analysis failed.
        </p>
      </div>
    );
  }

  if (findings.length === 0) {
    return (
      <div className="mt-8">
        <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
          Findings
        </h2>
        <p className="mt-3 text-sm text-zinc-500 dark:text-zinc-400">
          No findings detected.
        </p>
      </div>
    );
  }

  return (
    <div className="mt-8">
      <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
        Findings
      </h2>

      <div className="mt-3 flex flex-wrap gap-2" role="group" aria-label="Filter findings by severity">
        {SEVERITY_FILTERS.map((filter) => {
          const isActive = severityFilter === filter.value;
          const count = filter.value === "ALL"
            ? findings.length
            : severityCounts[filter.value as keyof typeof severityCounts];
          return (
            <button
              key={filter.value}
              onClick={() => setSeverityFilter(filter.value)}
              aria-pressed={isActive}
              className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                isActive
                  ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                  : "bg-zinc-100 text-zinc-700 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
              }`}
            >
              {filter.label}
              <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${
                isActive
                  ? "bg-white/20 text-white dark:bg-zinc-900/20 dark:text-zinc-900"
                  : "bg-zinc-200 text-zinc-600 dark:bg-zinc-700 dark:text-zinc-400"
              }`}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {filteredFindings.length === 0 ? (
        <p className="mt-4 text-sm text-zinc-500 dark:text-zinc-400">
          No findings match the selected filter.
        </p>
      ) : (
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-sm" role="table">
            <thead>
              <tr className="border-b border-zinc-200 dark:border-zinc-800">
                <th scope="col" className="px-3 py-2 text-left font-medium text-zinc-600 dark:text-zinc-400">
                  Severity
                </th>
                <th scope="col" className="px-3 py-2 text-left font-medium text-zinc-600 dark:text-zinc-400">
                  Type
                </th>
                <th scope="col" className="px-3 py-2 text-left font-medium text-zinc-600 dark:text-zinc-400">
                  Contract
                </th>
                <th scope="col" className="px-3 py-2 text-left font-medium text-zinc-600 dark:text-zinc-400">
                  File
                </th>
                <th scope="col" className="px-3 py-2 text-left font-medium text-zinc-600 dark:text-zinc-400">
                  Line
                </th>
                <th scope="col" className="px-3 py-2 text-left font-medium text-zinc-600 dark:text-zinc-400">
                  <span className="sr-only">Expand</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredFindings.map((finding) => {
                const isExpanded = expandedId === finding.id;
                const badgeClass = SEVERITY_BADGE_CLASSES[finding.severity] ?? "bg-zinc-100 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-200";
                return (
                  <FindingRow
                    key={finding.id}
                    finding={finding}
                    isExpanded={isExpanded}
                    badgeClass={badgeClass}
                    onToggle={() => toggleExpanded(finding.id)}
                  />
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function FindingRow({
  finding,
  isExpanded,
  badgeClass,
  onToggle,
}: {
  finding: Finding;
  isExpanded: boolean;
  badgeClass: string;
  onToggle: () => void;
}) {
  const detailId = `finding-detail-${finding.id}`;

  return (
    <>
      <tr className="border-b border-zinc-100 dark:border-zinc-800/50">
        <td className="px-3 py-2">
          <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${badgeClass}`}>
            {finding.severity}
          </span>
        </td>
        <td className="px-3 py-2 text-zinc-700 dark:text-zinc-300">
          {finding.type}
        </td>
        <td className="px-3 py-2 text-zinc-600 dark:text-zinc-400">
          {finding.contract ?? "\u2014"}
        </td>
        <td className="px-3 py-2 text-zinc-600 dark:text-zinc-400 font-mono text-xs">
          {finding.file ?? "\u2014"}
        </td>
        <td className="px-3 py-2 text-zinc-600 dark:text-zinc-400">
          {finding.line ?? "\u2014"}
        </td>
        <td className="px-3 py-2">
          <button
            onClick={onToggle}
            aria-expanded={isExpanded}
            aria-controls={detailId}
            className="inline-flex items-center justify-center rounded p-1 text-zinc-500 hover:text-zinc-700 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:text-zinc-200 dark:hover:bg-zinc-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1"
          >
            <svg
              className={`h-4 w-4 transition-transform ${isExpanded ? "rotate-90" : ""}`}
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2}
              stroke="currentColor"
              aria-hidden="true"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
            </svg>
            <span className="sr-only">{isExpanded ? "Collapse" : "Expand"} finding details</span>
          </button>
        </td>
      </tr>
      {isExpanded && (
        <tr id={detailId} role="row">
          <td colSpan={6} className="px-3 py-3 bg-zinc-50 dark:bg-zinc-900/50">
            <dl className="grid gap-2 text-sm sm:grid-cols-2">
              <div>
                <dt className="font-medium text-zinc-600 dark:text-zinc-400">Description</dt>
                <dd className="mt-0.5 text-zinc-700 dark:text-zinc-300">{finding.description}</dd>
              </div>
              <div>
                <dt className="font-medium text-zinc-600 dark:text-zinc-400">Source</dt>
                <dd className="mt-0.5 text-zinc-700 dark:text-zinc-300">{finding.source}</dd>
              </div>
              {finding.contract && (
                <div>
                  <dt className="font-medium text-zinc-600 dark:text-zinc-400">Contract</dt>
                  <dd className="mt-0.5 text-zinc-700 dark:text-zinc-300">{finding.contract}</dd>
                </div>
              )}
              <div>
                <dt className="font-medium text-zinc-600 dark:text-zinc-400">Location</dt>
                <dd className="mt-0.5 font-mono text-xs text-zinc-700 dark:text-zinc-300">
                  {finding.file ?? "unknown"}{finding.line ? `:${finding.line}` : ""}
                </dd>
              </div>
            </dl>
          </td>
        </tr>
      )}
    </>
  );
}

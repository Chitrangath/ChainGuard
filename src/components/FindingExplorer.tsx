"use client";

import { useState, useMemo } from "react";
import { findingFilterSchema } from "@/lib/validation";
import { ChevronIcon } from "./icons";
import { SeverityBadge } from "./Badge";
import { countBySeverity, sortFindingsBySeverity } from "@/lib/analysis-utils";
import type { FindingData } from "@/lib/analysis-utils";

interface FindingExplorerProps {
  findings: FindingData[];
  analysisStatus: string;
  securityAnalysisStatus?: string | null;
}

const SEVERITY_FILTERS = [
  { label: "All", value: "ALL" },
  { label: "Critical", value: "CRITICAL" },
  { label: "High", value: "HIGH" },
  { label: "Medium", value: "MEDIUM" },
  { label: "Low", value: "LOW" },
] as const;

export function FindingExplorer({
  findings,
  analysisStatus,
  securityAnalysisStatus,
}: FindingExplorerProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [severityFilter, setSeverityFilter] = useState("ALL");

  const severityCounts = useMemo(() => countBySeverity(findings), [findings]);

  const filteredFindings = useMemo(() => {
    const sorted = sortFindingsBySeverity(findings);
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
        <h2 className="heading-section">Findings</h2>
        <p className="mt-3 text-body" style={{ color: "var(--color-text-muted)" }}>
          Findings are unavailable because the analysis failed.
        </p>
      </div>
    );
  }

  if (findings.length === 0) {
    const scanRan = securityAnalysisStatus === "PASS";
    return (
      <div className="mt-8">
        <h2 className="heading-section">Findings</h2>
        <div
          className="mt-3 rounded-lg border border-dashed p-6 text-center"
          style={{ borderColor: "var(--color-border)" }}
        >
          <p className="text-body" style={{ color: "var(--color-text-muted)" }}>
            {scanRan
              ? "No security findings detected. The analysis passed all checks."
              : "No findings to display."}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="mt-8">
      <div className="flex items-center justify-between">
        <h2 className="heading-section">Findings</h2>
      </div>

      {/* Severity Filters */}
      <div
        className="mt-4 flex flex-wrap gap-2"
        role="group"
        aria-label="Filter findings by severity"
      >
        {SEVERITY_FILTERS.map((filter) => {
          const isActive = severityFilter === filter.value;
          const count =
            filter.value === "ALL"
              ? findings.length
              : severityCounts[filter.value as keyof typeof severityCounts];
          return (
            <button
              key={filter.value}
              onClick={() => setSeverityFilter(filter.value)}
              aria-pressed={isActive}
              className={`filter-pill focus-ring ${isActive ? "filter-pill-active" : ""}`}
            >
              {filter.label}
              <span
                className="rounded-full px-1.5 py-0.5 text-[10px] font-semibold"
                style={{
                  background: isActive
                    ? "rgba(255,255,255,0.2)"
                    : "var(--color-surface-sunken)",
                  color: isActive ? "inherit" : "var(--color-text-muted)",
                }}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Findings Table */}
      {filteredFindings.length === 0 ? (
        <div
          className="mt-4 rounded-lg border border-dashed p-6 text-center"
          style={{ borderColor: "var(--color-border)" }}
        >
          <p className="text-body" style={{ color: "var(--color-text-muted)" }}>
            No findings match the selected filter.
          </p>
        </div>
      ) : (
        <div className="mt-4 overflow-x-auto">
          <table
            className="w-full text-sm"
            role="table"
            aria-label="Security findings"
          >
            <thead>
              <tr className="table-header">
                <th scope="col" className="px-3 py-2.5 text-left">
                  Severity
                </th>
                <th scope="col" className="px-3 py-2.5 text-left">
                  Type
                </th>
                <th scope="col" className="px-3 py-2.5 text-left">
                  Contract
                </th>
                <th scope="col" className="px-3 py-2.5 text-left">
                  File
                </th>
                <th scope="col" className="px-3 py-2.5 text-left">
                  Line
                </th>
                <th scope="col" className="px-3 py-2.5 text-left">
                  <span className="sr-only">Expand</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredFindings.map((finding) => {
                const isExpanded = expandedId === finding.id;
                return (
                  <FindingRow
                    key={finding.id}
                    finding={finding}
                    isExpanded={isExpanded}
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
  onToggle,
}: {
  finding: FindingData;
  isExpanded: boolean;
  onToggle: () => void;
}) {
  const detailId = `finding-detail-${finding.id}`;
  return (
    <>
      <tr className="table-row">
        <td className="px-3 py-2.5">
          <SeverityBadge severity={finding.severity} />
        </td>
        <td className="px-3 py-2.5 font-medium" style={{ color: "var(--color-text)" }}>
          {finding.type}
        </td>
        <td className="px-3 py-2.5" style={{ color: "var(--color-text-secondary)" }}>
          {finding.contract ?? "—"}
        </td>
        <td
          className="px-3 py-2.5 text-code"
          style={{ color: "var(--color-text-secondary)" }}
        >
          {finding.file ?? "—"}
        </td>
        <td className="px-3 py-2.5" style={{ color: "var(--color-text-secondary)" }}>
          {finding.line ?? "—"}
        </td>
        <td className="px-3 py-2.5">
          <button
            onClick={onToggle}
            aria-expanded={isExpanded}
            aria-controls={detailId}
            className="inline-flex items-center justify-center rounded p-1 transition-colors focus-ring"
            style={{ color: "var(--color-text-muted)" }}
          >
            <ChevronIcon
              className={`h-4 w-4 transition-transform ${isExpanded ? "rotate-90" : ""}`}
            />
            <span className="sr-only">
              {isExpanded ? "Collapse" : "Expand"} finding details
            </span>
          </button>
        </td>
      </tr>
      {isExpanded && (
        <tr id={detailId}>
          <td
            colSpan={6}
            className="px-3 py-4"
            style={{ background: "var(--color-surface-sunken)" }}
          >
            <dl className="grid gap-3 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-label">Description</dt>
                <dd
                  className="mt-1 leading-relaxed"
                  style={{ color: "var(--color-text)" }}
                >
                  {finding.description}
                </dd>
              </div>
              <div>
                <dt className="text-label">Source</dt>
                <dd className="mt-1" style={{ color: "var(--color-text)" }}>
                  {finding.source}
                </dd>
              </div>
              <div>
                <dt className="text-label">Scope</dt>
                <dd className="mt-1" style={{ color: "var(--color-text)" }}>
                  {finding.scope.replaceAll("_", " ").toLowerCase()}
                </dd>
              </div>
              {finding.contract && (
                <div>
                  <dt className="text-label">Contract</dt>
                  <dd className="mt-1" style={{ color: "var(--color-text)" }}>
                    {finding.contract}
                  </dd>
                </div>
              )}
              <div>
                <dt className="text-label">Location</dt>
                <dd
                  className="mt-1 text-code"
                  style={{ color: "var(--color-text)" }}
                >
                  {finding.file ?? "unknown"}
                  {finding.line ? `:${finding.line}` : ""}
                </dd>
              </div>
            </dl>
          </td>
        </tr>
      )}
    </>
  );
}

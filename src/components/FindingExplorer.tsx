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
        <h2
          className="text-lg font-semibold"
          style={{ color: "var(--text-primary)" }}
        >
          Findings
        </h2>
        <p
          className="mt-3 text-sm"
          style={{ color: "var(--text-muted)" }}
        >
          Findings are unavailable because the analysis failed.
        </p>
      </div>
    );
  }

  if (findings.length === 0) {
    return (
      <div className="mt-8">
        <h2
          className="text-lg font-semibold"
          style={{ color: "var(--text-primary)" }}
        >
          Findings
        </h2>
        <div
          className="mt-3 rounded-lg border border-dashed p-6 text-center"
          style={{ borderColor: "var(--border-default)" }}
        >
          <p
            className="text-sm"
            style={{ color: "var(--text-muted)" }}
          >
            No security findings detected. The analysis passed all checks.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="mt-8">
      <h2
        className="text-lg font-semibold"
        style={{ color: "var(--text-primary)" }}
      >
        Findings
      </h2>

      {/* Severity Filters */}
      <div
        className="mt-3 flex flex-wrap gap-2"
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
              className="btn focus-ring"
              style={{
                padding: "0.25rem 0.75rem",
                fontSize: "0.75rem",
                minHeight: "auto",
                borderRadius: "9999px",
                background: isActive
                  ? "var(--color-action-primary)"
                  : "var(--color-action-secondary)",
                color: isActive
                  ? "var(--text-inverse)"
                  : "var(--text-secondary)",
                border: `1px solid ${isActive ? "transparent" : "var(--border-default)"}`,
              }}
            >
              {filter.label}
              <span
                className="ml-1 rounded-full px-1.5 py-0.5 text-[10px] font-semibold"
                style={{
                  background: isActive
                    ? "rgba(255,255,255,0.2)"
                    : "var(--surface-secondary)",
                  color: isActive ? "inherit" : "var(--text-muted)",
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
          style={{ borderColor: "var(--border-default)" }}
        >
          <p
            className="text-sm"
            style={{ color: "var(--text-muted)" }}
          >
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
              <tr
                className="border-b"
                style={{ borderColor: "var(--border-default)" }}
              >
                <th
                  scope="col"
                  className="px-3 py-2.5 text-left text-xs font-medium uppercase tracking-wide"
                  style={{ color: "var(--text-muted)" }}
                >
                  Severity
                </th>
                <th
                  scope="col"
                  className="px-3 py-2.5 text-left text-xs font-medium uppercase tracking-wide"
                  style={{ color: "var(--text-muted)" }}
                >
                  Type
                </th>
                <th
                  scope="col"
                  className="px-3 py-2.5 text-left text-xs font-medium uppercase tracking-wide"
                  style={{ color: "var(--text-muted)" }}
                >
                  Contract
                </th>
                <th
                  scope="col"
                  className="px-3 py-2.5 text-left text-xs font-medium uppercase tracking-wide"
                  style={{ color: "var(--text-muted)" }}
                >
                  File
                </th>
                <th
                  scope="col"
                  className="px-3 py-2.5 text-left text-xs font-medium uppercase tracking-wide"
                  style={{ color: "var(--text-muted)" }}
                >
                  Line
                </th>
                <th
                  scope="col"
                  className="px-3 py-2.5 text-left text-xs font-medium uppercase tracking-wide"
                  style={{ color: "var(--text-muted)" }}
                >
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
      <tr
        className="border-b transition-colors"
        style={{ borderColor: "var(--border-default)" }}
      >
        <td className="px-3 py-2.5">
          <SeverityBadge severity={finding.severity} />
        </td>
        <td
          className="px-3 py-2.5 font-medium"
          style={{ color: "var(--text-primary)" }}
        >
          {finding.type}
        </td>
        <td
          className="px-3 py-2.5"
          style={{ color: "var(--text-secondary)" }}
        >
          {finding.contract ?? "\u2014"}
        </td>
        <td
          className="px-3 py-2.5 font-mono text-xs"
          style={{ color: "var(--text-secondary)" }}
        >
          {finding.file ?? "\u2014"}
        </td>
        <td
          className="px-3 py-2.5"
          style={{ color: "var(--text-secondary)" }}
        >
          {finding.line ?? "\u2014"}
        </td>
        <td className="px-3 py-2.5">
          <button
            onClick={onToggle}
            aria-expanded={isExpanded}
            aria-controls={detailId}
            className="inline-flex items-center justify-center rounded p-1 transition-colors focus-ring"
            style={{ color: "var(--text-muted)" }}
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
        <tr id={detailId} role="row">
          <td
            colSpan={6}
            className="px-3 py-4"
            style={{ background: "var(--surface-secondary)" }}
          >
            <dl className="grid gap-3 text-sm sm:grid-cols-2">
              <div>
                <dt
                  className="text-xs font-medium uppercase tracking-wide"
                  style={{ color: "var(--text-muted)" }}
                >
                  Description
                </dt>
                <dd
                  className="mt-1 leading-relaxed"
                  style={{ color: "var(--text-primary)" }}
                >
                  {finding.description}
                </dd>
              </div>
              <div>
                <dt
                  className="text-xs font-medium uppercase tracking-wide"
                  style={{ color: "var(--text-muted)" }}
                >
                  Source
                </dt>
                <dd
                  className="mt-1"
                  style={{ color: "var(--text-primary)" }}
                >
                  {finding.source}
                </dd>
              </div>
              {finding.contract && (
                <div>
                  <dt
                    className="text-xs font-medium uppercase tracking-wide"
                    style={{ color: "var(--text-muted)" }}
                  >
                    Contract
                  </dt>
                  <dd
                    className="mt-1"
                    style={{ color: "var(--text-primary)" }}
                  >
                    {finding.contract}
                  </dd>
                </div>
              )}
              <div>
                <dt
                  className="text-xs font-medium uppercase tracking-wide"
                  style={{ color: "var(--text-muted)" }}
                >
                  Location
                </dt>
                <dd
                  className="mt-1 font-mono text-xs"
                  style={{ color: "var(--text-primary)" }}
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

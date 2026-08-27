"use client";

import { useState, useCallback } from "react";
import { HistoryIcon } from "./icons";
import { StatusBadge, DeploymentBadge } from "./Badge";
import type { AnalysisSummaryData } from "@/lib/analysis-utils";

interface AnalysisHistoryProps {
  projectId: string;
  analyses: AnalysisSummaryData[];
  totalAnalyses: number;
  selectedAnalysisId: string | null;
  onSelectAnalysis: (analysisId: string) => void;
}

const PAGE_SIZE = 10;

function formatShortDate(isoStr: string): string {
  const d = new Date(isoStr);
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

export function AnalysisHistory({
  projectId,
  analyses,
  totalAnalyses,
  selectedAnalysisId,
  onSelectAnalysis,
}: AnalysisHistoryProps) {
  const [page, setPage] = useState(1);
  const [serverAnalyses, setServerAnalyses] = useState(analyses);
  const [serverTotal, setServerTotal] = useState(totalAnalyses);
  const [loading, setLoading] = useState(false);

  const totalPages = Math.ceil(serverTotal / PAGE_SIZE);

  const fetchPage = useCallback(
    async (newPage: number) => {
      setLoading(true);
      try {
        const res = await fetch(
          `/api/projects/${projectId}/analyses?page=${newPage}&pageSize=${PAGE_SIZE}`,
        );
        if (res.ok) {
          const data = await res.json();
          setServerAnalyses(data.analyses);
          setServerTotal(data.pagination.total);
          setPage(newPage);
        }
      } catch {
        // Keep current state on error
      } finally {
        setLoading(false);
      }
    },
    [projectId],
  );

  if (serverAnalyses.length === 0 && !loading) {
    return (
      <div className="mt-8">
        <h2
          className="flex items-center gap-2 text-lg font-semibold"
          style={{ color: "var(--text-primary)" }}
        >
          <HistoryIcon
            className="h-5 w-5"
            style={{ color: "var(--text-muted)" }}
          />
          Analysis History
        </h2>
        <p
          className="mt-3 text-sm"
          style={{ color: "var(--text-muted)" }}
        >
          No analyses have been run on this project yet.
        </p>
      </div>
    );
  }

  return (
    <div className="mt-8">
      <div className="flex items-center justify-between">
        <h2
          className="flex items-center gap-2 text-lg font-semibold"
          style={{ color: "var(--text-primary)" }}
        >
          <HistoryIcon
            className="h-5 w-5"
            style={{ color: "var(--text-muted)" }}
          />
          Analysis History
        </h2>
        {totalPages > 1 && (
          <span
            className="text-xs"
            style={{ color: "var(--text-muted)" }}
          >
            Page {page} of {totalPages}
          </span>
        )}
      </div>

      <div className="mt-3 space-y-2" aria-busy={loading}>
        {serverAnalyses.map((analysis) => {
          const isSelected = analysis.id === selectedAnalysisId;
          const shortId = analysis.id.slice(0, 7);

          return (
            <button
              key={analysis.id}
              onClick={() => onSelectAnalysis(analysis.id)}
              aria-current={isSelected ? "true" : undefined}
              className="w-full text-left rounded-lg border px-4 py-3 transition-all focus-ring"
              style={{
                background: isSelected
                  ? "var(--color-running-bg)"
                  : "var(--surface-primary)",
                borderColor: isSelected
                  ? "var(--color-running-border)"
                  : "var(--border-default)",
              }}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span
                    className="font-mono text-sm font-medium"
                    style={{ color: "var(--text-secondary)" }}
                  >
                    {shortId}
                  </span>
                  <StatusBadge status={analysis.status} />
                </div>
                <div className="flex items-center gap-4">
                  {analysis.riskScore !== null && (
                    <span
                      className="text-sm font-semibold"
                      style={{ color: "var(--text-primary)" }}
                    >
                      {analysis.riskScore}/100
                    </span>
                  )}
                  <DeploymentBadge status={analysis.deploymentStatus} />
                  <span
                    className="text-xs"
                    style={{ color: "var(--text-muted)" }}
                  >
                    {formatShortDate(analysis.createdAt)}
                  </span>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-center gap-2">
          <button
            onClick={() => fetchPage(page - 1)}
            disabled={page <= 1 || loading}
            className="btn btn-secondary btn-sm focus-ring"
          >
            Previous
          </button>
          <span
            className="px-3 text-xs"
            style={{ color: "var(--text-muted)" }}
          >
            {page} / {totalPages}
          </span>
          <button
            onClick={() => fetchPage(page + 1)}
            disabled={page >= totalPages || loading}
            className="btn btn-secondary btn-sm focus-ring"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}

"use client";

import { useState, useCallback } from "react";
import type { AnalysisSummaryData } from "@/lib/analysis-utils";

interface AnalysisHistoryProps {
  projectId: string;
  analyses: AnalysisSummaryData[];
  totalAnalyses: number;
  selectedAnalysisId: string | null;
  onSelectAnalysis: (analysisId: string) => void;
}

const PAGE_SIZE = 10;

const STATUS_BADGE_CLASSES: Record<string, string> = {
  QUEUED: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
  RUNNING: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  COMPLETED: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  FAILED: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
};

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

  const fetchPage = useCallback(async (newPage: number) => {
    setLoading(true);
    try {
      const res = await fetch(
        `/api/projects/${projectId}/analyses?page=${newPage}&pageSize=${PAGE_SIZE}`
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
  }, [projectId]);

  if (serverAnalyses.length === 0 && !loading) {
    return (
      <div className="mt-8">
        <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
          Analysis History
        </h2>
        <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
          No analyses yet.
        </p>
      </div>
    );
  }

  return (
    <div className="mt-8">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
          Analysis History
        </h2>
        {totalPages > 1 && (
          <span className="text-xs text-zinc-500 dark:text-zinc-400">
            Page {page} of {totalPages}
          </span>
        )}
      </div>

      <div className="mt-3 space-y-2" aria-busy={loading}>
        {serverAnalyses.map((analysis) => {
          const isSelected = analysis.id === selectedAnalysisId;
          const statusClass = STATUS_BADGE_CLASSES[analysis.status] ?? "bg-zinc-100 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-200";
          const shortId = analysis.id.slice(0, 7);

          return (
            <button
              key={analysis.id}
              onClick={() => onSelectAnalysis(analysis.id)}
              aria-current={isSelected ? "true" : undefined}
              className={`w-full text-left flex items-center justify-between rounded-lg border px-4 py-3 transition-colors ${
                isSelected
                  ? "border-blue-300 bg-blue-50 dark:border-blue-700 dark:bg-blue-950"
                  : "border-zinc-200 bg-white hover:border-zinc-300 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-zinc-700"
              }`}
            >
              <div className="flex items-center gap-3">
                <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                  {shortId}
                </span>
                <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${statusClass}`}>
                  {analysis.status}
                </span>
              </div>
              <div className="flex items-center gap-4">
                {analysis.riskScore !== null && (
                  <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                    {analysis.riskScore}/100
                  </span>
                )}
                {analysis.deploymentStatus && (
                  <span
                    className={`text-xs font-medium ${
                      analysis.deploymentStatus === "READY"
                        ? "text-green-600 dark:text-green-400"
                        : "text-red-600 dark:text-red-400"
                    }`}
                  >
                    {analysis.deploymentStatus}
                  </span>
                )}
                <span className="text-xs text-zinc-400 dark:text-zinc-500">
                  {new Date(analysis.createdAt).toLocaleDateString()}
                </span>
              </div>
            </button>
          );
        })}
      </div>

      {totalPages > 1 && (
        <div className="mt-3 flex items-center justify-center gap-2">
          <button
            onClick={() => fetchPage(page - 1)}
            disabled={page <= 1 || loading}
            className="rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800"
          >
            Previous
          </button>
          <span className="text-xs text-zinc-500 dark:text-zinc-400">
            {page} / {totalPages}
          </span>
          <button
            onClick={() => fetchPage(page + 1)}
            disabled={page >= totalPages || loading}
            className="rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}

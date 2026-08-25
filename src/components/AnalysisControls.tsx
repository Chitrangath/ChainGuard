"use client";

import { useState, useEffect, useCallback, useRef } from "react";

interface AnalysisStatusProps {
  projectId: string;
  latestAnalysis: {
    id: string;
    status: string;
  } | null;
}

export function AnalysisControls({
  projectId,
  latestAnalysis,
}: AnalysisStatusProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [currentAnalysis, setCurrentAnalysis] = useState(latestAnalysis);
  const [polling, setPolling] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const isTerminal = (status: string) =>
    status === "COMPLETED" || status === "FAILED";

  const checkAndPoll = useCallback(
    async (analysisId: string) => {
      try {
        const res = await fetch(`/api/analyses/${analysisId}`);
        if (res.ok && mountedRef.current) {
          const data = await res.json();
          setCurrentAnalysis({ id: data.id, status: data.status });
          return !isTerminal(data.status);
        }
      } catch {
        // ignore poll errors
      }
      return false;
    },
    [],
  );

  useEffect(() => {
    if (!currentAnalysis || isTerminal(currentAnalysis.status)) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
        if (mountedRef.current) setPolling(false);
      }
      return;
    }

    if (mountedRef.current) setPolling(true);

    intervalRef.current = setInterval(async () => {
      const shouldContinue = await checkAndPoll(currentAnalysis.id);
      if (!shouldContinue && intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
        if (mountedRef.current) setPolling(false);
      }
    }, 2000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [currentAnalysis, checkAndPoll]);

  async function handleRunAnalysis() {
    setLoading(true);
    setError("");

    try {
      const res = await fetch(`/api/projects/${projectId}/analyze`, {
        method: "POST",
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to start analysis");
        return;
      }

      setCurrentAnalysis({ id: data.analysisId, status: data.status });
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  const isActive =
    currentAnalysis?.status === "QUEUED" ||
    currentAnalysis?.status === "RUNNING";

  return (
    <div className="flex flex-col items-end gap-2">
      <button
        onClick={handleRunAnalysis}
        disabled={loading || polling}
        className="inline-flex items-center rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-zinc-700 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
      >
        {loading
          ? "Starting..."
          : polling
            ? "Analysis in progress..."
            : "Run Analysis"}
      </button>

      {currentAnalysis && (
        <div className="text-right">
          <span
            className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${
              currentAnalysis.status === "QUEUED"
                ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200"
                : currentAnalysis.status === "RUNNING"
                  ? "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
                  : currentAnalysis.status === "COMPLETED"
                    ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                    : currentAnalysis.status === "FAILED"
                      ? "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
                      : "bg-zinc-100 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-200"
            }`}
          >
            {currentAnalysis.status}
          </span>
        </div>
      )}

      {error && (
        <p className="text-xs text-red-600 dark:text-red-400">{error}</p>
      )}

      {isActive && (
        <p className="text-xs text-zinc-500 dark:text-zinc-400">
          Polling for updates...
        </p>
      )}
    </div>
  );
}

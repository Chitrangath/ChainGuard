"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";

interface AnalysisControlsProps {
  projectId: string;
  activeAnalysis: {
    id: string;
    status: string;
    createdAt: string;
  } | null;
}

const MAX_CONSECUTIVE_FAILURES = 3;
const POLL_INTERVAL_MS = 2000;

export function AnalysisControls({
  projectId,
  activeAnalysis,
}: AnalysisControlsProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [currentAnalysis, setCurrentAnalysis] = useState(activeAnalysis);
  const [polling, setPolling] = useState(false);
  const [pollError, setPollError] = useState(false);

  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const mountedRef = useRef(true);
  const failuresRef = useRef(0);
  const refreshCalledRef = useRef(false);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  // Sync prop changes into state (e.g. after router.refresh)
  useEffect(() => {
    setCurrentAnalysis(activeAnalysis);
    if (activeAnalysis) {
      refreshCalledRef.current = false;
      failuresRef.current = 0;
      setPollError(false);
    }
  }, [activeAnalysis]);

  const isTerminal = (status: string) =>
    status === "COMPLETED" || status === "FAILED";

  const stopPolling = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    if (abortRef.current) {
      abortRef.current.abort();
      abortRef.current = null;
    }
    if (mountedRef.current) {
      setPolling(false);
    }
  }, []);

  // pollOnce: no dependency on currentAnalysis — uses functional update where needed
  const pollOnce = useCallback(async (analysisId: string): Promise<boolean> => {
    if (abortRef.current) {
      abortRef.current.abort();
    }
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const res = await fetch(`/api/analyses/${analysisId}`, {
        signal: controller.signal,
      });

      if (!mountedRef.current) return false;

      if (res.ok) {
        const data = await res.json();
        // Use functional update — no dependency on currentAnalysis
        setCurrentAnalysis((prev) => ({
          id: data.id,
          status: data.status,
          createdAt: prev?.createdAt ?? "",
        }));
        failuresRef.current = 0;
        setPollError(false);
        return !isTerminal(data.status);
      }

      failuresRef.current++;
      if (failuresRef.current >= MAX_CONSECUTIVE_FAILURES) {
        setPollError(true);
        return false;
      }
      return true;
    } catch (err) {
      if (!mountedRef.current) return false;
      if (err instanceof DOMException && err.name === "AbortError") {
        return false;
      }
      failuresRef.current++;
      if (failuresRef.current >= MAX_CONSECUTIVE_FAILURES) {
        setPollError(true);
        return false;
      }
      return true;
    }
  }, []); // No dependencies — uses functional update

  const triggerRefreshOnce = useCallback(() => {
    if (!refreshCalledRef.current) {
      refreshCalledRef.current = true;
      router.refresh();
    }
  }, [router]);

  const startPolling = useCallback((analysisId: string) => {
    stopPolling();
    if (!mountedRef.current) return;

    setPolling(true);
    failuresRef.current = 0;
    refreshCalledRef.current = false;
    setPollError(false);

    const scheduleNext = () => {
      if (!mountedRef.current) return;
      timeoutRef.current = setTimeout(async () => {
        if (!mountedRef.current) return;
        const shouldContinue = await pollOnce(analysisId);
        if (shouldContinue && mountedRef.current) {
          scheduleNext();
        } else if (mountedRef.current) {
          triggerRefreshOnce();
          setPolling(false);
          failuresRef.current = 0;
        }
      }, POLL_INTERVAL_MS);
    };

    // Immediate first check
    pollOnce(analysisId).then((shouldContinue) => {
      if (shouldContinue && mountedRef.current) {
        scheduleNext();
      } else if (mountedRef.current) {
        triggerRefreshOnce();
        setPolling(false);
        failuresRef.current = 0;
      }
    });
  }, [pollOnce, stopPolling, triggerRefreshOnce]);

  // Start polling if there's an active analysis
  useEffect(() => {
    if (currentAnalysis && !isTerminal(currentAnalysis.status)) {
      startPolling(currentAnalysis.id);
    }
    return () => stopPolling();
  }, [currentAnalysis?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleRetry = () => {
    if (currentAnalysis && !isTerminal(currentAnalysis.status)) {
      failuresRef.current = 0;
      setPollError(false);
      startPolling(currentAnalysis.id);
    }
  };

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

      setCurrentAnalysis({ id: data.analysisId, status: data.status, createdAt: new Date().toISOString() });
      router.refresh();
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
        disabled={loading || isActive}
        aria-busy={loading}
        className="inline-flex items-center rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-zinc-700 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
      >
        {loading
          ? "Starting..."
          : isActive
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
        <p className="text-xs text-red-600 dark:text-red-400" role="alert">
          {error}
        </p>
      )}

      {pollError && (
        <div className="flex items-center gap-2" role="alert">
          <p className="text-xs text-amber-600 dark:text-amber-400">
            Polling interrupted
          </p>
          <button
            onClick={handleRetry}
            className="text-xs font-medium text-amber-700 underline hover:text-amber-900 dark:text-amber-300 dark:hover:text-amber-100"
          >
            Retry
          </button>
        </div>
      )}

      {isActive && !pollError && (
        <p className="text-xs text-zinc-500 dark:text-zinc-400" aria-live="polite">
          Polling for updates...
        </p>
      )}
    </div>
  );
}

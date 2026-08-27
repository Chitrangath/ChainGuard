"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { StatusBadge } from "./Badge";

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
    setCurrentAnalysis(activeAnalysis); // eslint-disable-line react-hooks/set-state-in-effect
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
        className="btn btn-primary focus-ring"
      >
        {loading
          ? "Starting..."
          : isActive
            ? "Analysis in progress..."
            : "Run Analysis"}
      </button>

      {currentAnalysis && (
        <div className="text-right">
          <StatusBadge status={currentAnalysis.status} />
        </div>
      )}

      {error && (
        <p
          className="text-xs font-medium"
          style={{ color: "var(--color-critical)" }}
          role="alert"
        >
          {error}
        </p>
      )}

      {pollError && (
        <div className="flex items-center gap-2" role="alert">
          <p
            className="text-xs"
            style={{ color: "var(--color-medium)" }}
          >
            Polling interrupted
          </p>
          <button
            onClick={handleRetry}
            className="text-xs font-medium underline focus-ring"
            style={{ color: "var(--color-medium)" }}
          >
            Retry
          </button>
        </div>
      )}

      {isActive && !pollError && (
        <p
          className="text-xs animate-pulse-subtle"
          style={{ color: "var(--text-muted)" }}
          aria-live="polite"
        >
          Polling for updates...
        </p>
      )}
    </div>
  );
}

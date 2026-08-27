"use client";

import { useRouter } from "next/navigation";
import { AnalysisControls } from "./AnalysisControls";
import { AnalysisSummary } from "./AnalysisSummary";
import { FindingExplorer } from "./FindingExplorer";
import { AnalysisHistory } from "./AnalysisHistory";
import {
  ExternalLinkIcon,
  ShieldIcon,
} from "./icons";
import { StatusBadge } from "./Badge";
import type { AnalysisData, AnalysisSummaryData } from "@/lib/analysis-utils";

interface AnalysisViewProps {
  project: {
    id: string;
    name: string;
    repositoryUrl: string;
    description: string | null;
    createdAt: string;
  };
  activeAnalysis: {
    id: string;
    status: string;
    createdAt: string;
  } | null;
  selectedAnalysis: AnalysisData | null;
  historyAnalyses: AnalysisSummaryData[];
  totalAnalyses: number;
  selectedAnalysisId: string | null;
}

function formatRelativeDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function AnalysisView({
  project,
  activeAnalysis,
  selectedAnalysis,
  historyAnalyses,
  totalAnalyses,
  selectedAnalysisId,
}: AnalysisViewProps) {
  const router = useRouter();

  const handleSelectAnalysis = (analysisId: string) => {
    router.push(`/projects/${project.id}?analysisId=${analysisId}`);
  };

  const handleBackToLatest = () => {
    router.push(`/projects/${project.id}`);
  };

  const isViewingHistorical = selectedAnalysisId !== null;

  return (
    <>
      {/* Project Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2.5">
            <ShieldIcon
              className="h-5 w-5 shrink-0"
              style={{ color: "var(--text-muted)" }}
            />
            <h1
              className="truncate text-2xl font-bold tracking-tight"
              style={{ color: "var(--text-primary)" }}
            >
              {project.name}
            </h1>
            {activeAnalysis && (
              <StatusBadge status={activeAnalysis.status} />
            )}
          </div>
          <div className="mt-1.5 flex items-center gap-1.5">
            <a
              href={project.repositoryUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 font-mono text-sm focus-ring"
              style={{ color: "var(--color-low)" }}
            >
              {project.repositoryUrl.replace(/^https:\/\/github\.com\//, "")}
              <ExternalLinkIcon className="h-3.5 w-3.5" />
            </a>
          </div>
          {project.description && (
            <p
              className="mt-2 text-sm leading-relaxed"
              style={{ color: "var(--text-secondary)" }}
            >
              {project.description}
            </p>
          )}
          <p
            className="mt-1 text-xs"
            style={{ color: "var(--text-muted)" }}
          >
            Created {formatRelativeDate(project.createdAt)}
          </p>
        </div>
        <AnalysisControls
          projectId={project.id}
          activeAnalysis={activeAnalysis}
        />
      </div>

      {/* Historical Analysis Banner */}
      {isViewingHistorical && (
        <div
          className="mt-4 flex items-center justify-between rounded-lg border px-4 py-3"
          style={{
            background: "var(--color-medium-bg)",
            borderColor: "var(--color-medium-border)",
          }}
          role="status"
        >
          <span
            className="text-sm font-medium"
            style={{ color: "var(--color-medium)" }}
          >
            Viewing historical analysis
          </span>
          <button
            onClick={handleBackToLatest}
            className="btn btn-ghost btn-sm focus-ring"
            style={{ color: "var(--color-medium)" }}
          >
            Back to latest
          </button>
        </div>
      )}

      {/* Analysis Content */}
      {selectedAnalysis ? (
        <>
          <AnalysisSummary analysis={selectedAnalysis} />
          <FindingExplorer
            findings={selectedAnalysis.findings}
            analysisStatus={selectedAnalysis.status}
          />
        </>
      ) : activeAnalysis ? (
        <div
          className="mt-8 rounded-lg border p-8 text-center"
          style={{
            background: "var(--color-running-bg)",
            borderColor: "var(--color-running-border)",
          }}
        >
          <div className="flex items-center justify-center gap-2">
            <span
              className="h-2 w-2 rounded-full animate-pulse-subtle"
              style={{ background: "var(--color-running)" }}
            />
            <p
              className="text-sm font-medium"
              style={{ color: "var(--color-running)" }}
            >
              Analysis is{" "}
              {activeAnalysis.status === "QUEUED" ? "queued" : "running"}...
            </p>
          </div>
          <p
            className="mt-2 text-xs"
            style={{ color: "var(--text-muted)" }}
          >
            The page will update automatically when complete.
          </p>
        </div>
      ) : (
        <div
          className="mt-8 rounded-lg border border-dashed p-8 text-center"
          style={{ borderColor: "var(--border-default)" }}
        >
          <ShieldIcon
            className="mx-auto h-8 w-8"
            style={{ color: "var(--text-muted)" }}
          />
          <p
            className="mt-2 text-sm"
            style={{ color: "var(--text-muted)" }}
          >
            No analysis yet. Run your first analysis to see security results
            here.
          </p>
        </div>
      )}

      {/* Analysis History */}
      <AnalysisHistory
        projectId={project.id}
        analyses={historyAnalyses}
        totalAnalyses={totalAnalyses}
        selectedAnalysisId={selectedAnalysisId}
        onSelectAnalysis={handleSelectAnalysis}
      />
    </>
  );
}

"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { AnalysisControls } from "./AnalysisControls";
import { AnalysisSummary } from "./AnalysisSummary";
import { FindingExplorer } from "./FindingExplorer";
import { AnalysisHistory } from "./AnalysisHistory";
import { ExternalLinkIcon, ShieldIcon, ArrowLeftIcon } from "./icons";
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
      {/* Page Header */}
      <div className="flex items-center gap-3">
        <Link
          className="btn btn-ghost btn-sm focus-ring"
          href="/dashboard"
        >
          <ArrowLeftIcon className="h-4 w-4" />
          <span className="hidden sm:inline">Dashboard</span>
        </Link>
      </div>

      {/* Project Header */}
      <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2.5">
            <h1 className="heading-page truncate">{project.name}</h1>
            {activeAnalysis && <StatusBadge status={activeAnalysis.status} />}
          </div>
          <div className="mt-1.5 flex items-center gap-1.5">
            <a
              href={project.repositoryUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-code text-sm focus-ring"
              style={{ color: "var(--color-primary)" }}
            >
              {project.repositoryUrl.replace(/^https:\/\/github\.com\//, "")}
              <ExternalLinkIcon className="h-3.5 w-3.5" />
            </a>
          </div>
          {project.description && (
            <p className="mt-2 text-body" style={{ color: "var(--color-text-secondary)" }}>
              {project.description}
            </p>
          )}
        </div>
        <AnalysisControls projectId={project.id} activeAnalysis={activeAnalysis} />
      </div>

      {/* Historical Analysis Banner */}
      {isViewingHistorical && (
        <div
          className="mt-4 flex items-center justify-between rounded-lg border px-4 py-3"
          style={{ background: "var(--color-primary-muted)", borderColor: "var(--color-primary)" }}
          role="status"
        >
          <span className="text-body font-medium" style={{ color: "var(--color-primary)" }}>
            Viewing historical analysis
          </span>
          <button onClick={handleBackToLatest} className="btn btn-ghost btn-sm focus-ring" style={{ color: "var(--color-primary)" }}>
            Back to latest
          </button>
        </div>
      )}

      {/* Analysis Content */}
      {selectedAnalysis ? (
        <>
          <AnalysisSummary analysis={selectedAnalysis} />
          {selectedAnalysis.evidenceStatus === "VERIFIED" && (
            <FindingExplorer findings={selectedAnalysis.findings} analysisStatus={selectedAnalysis.status} securityAnalysisStatus={selectedAnalysis.securityAnalysisStatus} />
          )}
        </>
      ) : activeAnalysis ? (
        <div
          className="mt-8 rounded-lg border p-8 text-center"
          style={{ background: "var(--color-running-bg)", borderColor: "var(--color-running-border)" }}
        >
          <div className="flex items-center justify-center gap-2">
            <span
              className="h-2 w-2 rounded-full animate-pulse-subtle"
              style={{ background: "var(--color-running)" }}
            />
            <p className="text-body font-medium" style={{ color: "var(--color-running)" }}>
              Analysis is {activeAnalysis.status === "QUEUED" ? "queued" : "running"}...
            </p>
          </div>
          <p className="mt-2 text-metadata" style={{ color: "var(--color-text-muted)" }}>
            The page will update automatically when complete.
          </p>
        </div>
      ) : (
        <div
          className="mt-8 rounded-lg border border-dashed p-8 text-center"
          style={{ borderColor: "var(--color-border)" }}
        >
          <ShieldIcon className="mx-auto h-8 w-8" style={{ color: "var(--color-text-muted)" }} />
          <p className="mt-2 text-body" style={{ color: "var(--color-text-muted)" }}>
            No analysis yet. Run your first analysis to see security results here.
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

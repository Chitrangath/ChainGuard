"use client";

import { useRouter } from "next/navigation";
import { AnalysisControls } from "./AnalysisControls";
import { AnalysisSummary } from "./AnalysisSummary";
import { FindingExplorer } from "./FindingExplorer";
import { AnalysisHistory } from "./AnalysisHistory";

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
  selectedAnalysis: {
    id: string;
    status: string;
    riskScore: number | null;
    deploymentStatus: string | null;
    compilationStatus: string | null;
    testStatus: string | null;
    totalTests: number | null;
    passedTests: number | null;
    failedTests: number | null;
    startedAt: string | null;
    completedAt: string | null;
    createdAt: string;
    findings: Array<{
      id: string;
      severity: string;
      type: string;
      contract: string | null;
      file: string | null;
      line: number | null;
      description: string;
      source: string;
    }>;
  } | null;
  historyAnalyses: Array<{
    id: string;
    status: string;
    riskScore: number | null;
    deploymentStatus: string | null;
    compilationStatus: string | null;
    testStatus: string | null;
    totalTests: number | null;
    passedTests: number | null;
    failedTests: number | null;
    startedAt: string | null;
    completedAt: string | null;
    createdAt: string;
    findingCount: number;
  }>;
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
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
            {project.name}
          </h1>
          <a
            href={project.repositoryUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-1 block text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 font-mono"
          >
            {project.repositoryUrl}
          </a>
          {project.description && (
            <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
              {project.description}
            </p>
          )}
          <p className="mt-1 text-xs text-zinc-400 dark:text-zinc-500">
            Created {new Date(project.createdAt).toLocaleDateString()}
          </p>
        </div>
        <AnalysisControls
          projectId={project.id}
          activeAnalysis={activeAnalysis}
        />
      </div>

      {isViewingHistorical && (
        <div className="mt-4 flex items-center gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 dark:border-amber-800 dark:bg-amber-950">
          <span className="text-sm text-amber-700 dark:text-amber-300">
            Viewing historical analysis
          </span>
          <button
            onClick={handleBackToLatest}
            className="text-sm font-medium text-amber-700 underline hover:text-amber-900 dark:text-amber-300 dark:hover:text-amber-100"
          >
            Back to latest
          </button>
        </div>
      )}

      {selectedAnalysis ? (
        <>
          <AnalysisSummary analysis={selectedAnalysis} />

          <FindingExplorer
            findings={selectedAnalysis.findings}
            analysisStatus={selectedAnalysis.status}
          />
        </>
      ) : activeAnalysis ? (
        <div className="mt-8 rounded-lg border border-blue-200 bg-blue-50 p-8 text-center dark:border-blue-800 dark:bg-blue-950">
          <p className="text-sm text-blue-700 dark:text-blue-300">
            Analysis is {activeAnalysis.status.toLowerCase()}...
          </p>
        </div>
      ) : (
        <div className="mt-8 rounded-lg border border-dashed border-zinc-300 p-8 text-center dark:border-zinc-700">
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            No analysis yet. Run your first analysis to see results here.
          </p>
        </div>
      )}

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

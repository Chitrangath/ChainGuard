import { RiskScore } from "@/components/RiskScore";
import { DeploymentGate } from "@/components/DeploymentGate";
import { MetricsCard } from "@/components/MetricsCard";
import { FindingTable } from "@/components/FindingTable";

export default async function ProjectPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
            Project
          </h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 font-mono">
            {id}
          </p>
        </div>
        <button
          disabled
          className="inline-flex items-center rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white opacity-50 dark:bg-zinc-100 dark:text-zinc-900"
        >
          Run Analysis
        </button>
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-1">
          <RiskScore score={null} />
        </div>
        <div className="lg:col-span-2">
          <DeploymentGate status={null} />
        </div>
      </div>

      <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <MetricsCard label="Compilation" value="—" />
        <MetricsCard label="Tests" value="—" />
        <MetricsCard label="Findings" value="—" />
        <MetricsCard label="Risk Score" value="—" />
      </div>

      <div className="mt-8">
        <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
          Findings
        </h2>
        <div className="mt-3">
          <FindingTable findings={[]} />
        </div>
      </div>

      <div className="mt-8">
        <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
          Analysis History
        </h2>
        <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
          No analyses yet. Run your first analysis to see results here.
        </p>
      </div>
    </div>
  );
}

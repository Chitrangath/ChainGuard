"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { SearchIcon, FilterIcon, ExternalLinkIcon, BarChartIcon, XIcon } from "./icons";
import {
  lifecycleLabel,
  deploymentLabel,
  lifecycleBadgeClass,
  deploymentBadgeClass,
  riskColor,
  extractRepoDisplay,
} from "@/lib/project-utils";

interface ProjectData {
  id: string;
  name: string;
  repositoryUrl: string;
  description: string | null;
  createdAt: Date;
  analyses: {
    id: string;
    status: string;
    riskScore: number | null;
    deploymentStatus: string | null;
    createdAt: Date;
    evidenceStatus?: "VERIFIED" | "LEGACY_UNVERIFIED";
  }[];
}

type SortKey = "name" | "risk" | "recent";
type FilterState = "ALL" | "QUEUED" | "RUNNING" | "COMPLETED" | "FAILED" | "NONE";
type GateFilter = "ALL" | "READY" | "BLOCKED" | "NONE";

function timeAgo(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export function ProjectExplorer({ projects }: { projects: ProjectData[] }) {
  const [query, setQuery] = useState("");
  const [stateFilter, setStateFilter] = useState<FilterState>("ALL");
  const [gateFilter, setGateFilter] = useState<GateFilter>("ALL");
  const [sortBy, setSortBy] = useState<SortKey>("recent");

  const filtered = useMemo(() => {
    let result = projects;

    // Search
    if (query.trim()) {
      const q = query.toLowerCase();
      result = result.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.repositoryUrl.toLowerCase().includes(q) ||
          extractRepoDisplay(p.repositoryUrl).toLowerCase().includes(q),
      );
    }

    // State filter
    if (stateFilter !== "ALL") {
      result = result.filter((p) => {
        const latest = p.analyses[0];
        if (stateFilter === "NONE") return !latest;
        return latest?.status === stateFilter;
      });
    }

    // Gate filter
    if (gateFilter !== "ALL") {
      result = result.filter((p) => {
        const latest = p.analyses[0];
        if (gateFilter === "NONE") return !latest?.deploymentStatus;
        return latest?.deploymentStatus === gateFilter;
      });
    }

    // Sort
    result = [...result].sort((a, b) => {
      if (sortBy === "name") return a.name.localeCompare(b.name);
      if (sortBy === "risk") {
        const aScore = a.analyses[0]?.riskScore ?? -1;
        const bScore = b.analyses[0]?.riskScore ?? -1;
        return bScore - aScore;
      }
      // recent
      const aTime = a.analyses[0]?.createdAt.getTime() ?? 0;
      const bTime = b.analyses[0]?.createdAt.getTime() ?? 0;
      return bTime - aTime;
    });

    return result;
  }, [projects, query, stateFilter, gateFilter, sortBy]);

  const hasFilters = query.trim() || stateFilter !== "ALL" || gateFilter !== "ALL";

  return (
    <div>
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px]">
          <SearchIcon
            className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2"
            style={{ color: "var(--color-text-muted)" }}
          />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search projects..."
            className="input focus-ring w-full pl-9 pr-3"
          />
        </div>

        {/* State filter */}
        <select
          value={stateFilter}
          onChange={(e) => setStateFilter(e.target.value as FilterState)}
          className="input focus-ring text-sm"
          aria-label="Filter by lifecycle state"
        >
          <option value="ALL">All states</option>
          <option value="QUEUED">Queued</option>
          <option value="RUNNING">Running</option>
          <option value="COMPLETED">Completed</option>
          <option value="FAILED">Failed</option>
          <option value="NONE">Not analyzed</option>
        </select>

        {/* Gate filter */}
        <select
          value={gateFilter}
          onChange={(e) => setGateFilter(e.target.value as GateFilter)}
          className="input focus-ring text-sm"
          aria-label="Filter by deployment gate"
        >
          <option value="ALL">All gates</option>
          <option value="READY">Ready</option>
          <option value="BLOCKED">Blocked</option>
          <option value="NONE">No gate</option>
        </select>

        {/* Sort */}
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as SortKey)}
          className="input focus-ring text-sm"
          aria-label="Sort projects"
        >
          <option value="recent">Most recent</option>
          <option value="name">Name</option>
          <option value="risk">Risk score</option>
        </select>

        {/* Clear filters */}
        {hasFilters && (
          <button
            onClick={() => {
              setQuery("");
              setStateFilter("ALL");
              setGateFilter("ALL");
            }}
            className="btn btn-secondary btn-sm focus-ring"
          >
            <XIcon className="h-3 w-3" />
            Clear
          </button>
        )}
      </div>

      {/* Result count */}
      <div className="mt-3 text-metadata" style={{ color: "var(--color-text-muted)" }}>
        {filtered.length} project{filtered.length !== 1 ? "s" : ""}
        {hasFilters && ` (filtered from ${projects.length})`}
      </div>

      {/* Desktop table */}
      {filtered.length === 0 ? (
        <div className="mt-6 surface-card p-12 text-center">
          <FilterIcon className="mx-auto h-8 w-8" style={{ color: "var(--color-text-muted)" }} />
          <p className="heading-card mt-3">No projects match filters</p>
          <p className="mt-1 text-metadata" style={{ color: "var(--color-text-secondary)" }}>
            Try adjusting your search or filter criteria.
          </p>
        </div>
      ) : (
        <div className="mt-4 overflow-hidden rounded-xl border hidden md:block" style={{ borderColor: "var(--color-border)" }}>
          <div className="overflow-x-auto">
            <table className="w-full table-fixed">
              <colgroup>
                <col style={{ width: "35%" }} />
                <col style={{ width: "15%" }} />
                <col style={{ width: "10%" }} />
                <col style={{ width: "15%" }} />
                <col style={{ width: "15%" }} />
                <col style={{ width: "10%" }} />
              </colgroup>
              <thead>
                <tr style={{ borderBottom: "1px solid var(--color-border)" }}>
                  <th scope="col" className="px-4 py-3 text-left text-label">Project</th>
                  <th scope="col" className="px-4 py-3 text-left text-label">State</th>
                  <th scope="col" className="px-4 py-3 text-center text-label">Risk</th>
                  <th scope="col" className="px-4 py-3 text-left text-label">Gate</th>
                  <th scope="col" className="px-4 py-3 text-left text-label">Last Analysis</th>
                  <th scope="col" className="px-4 py-3 text-right text-label">Action</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((project) => {
                  const latest = project.analyses[0];
                  const lifecycle = latest?.status;
                  const deployment = latest?.deploymentStatus;
                  const hasAnalysis = latest != null;
                  return (
                    <tr
                      key={project.id}
                      className="transition-colors"
                      style={{ borderBottom: "1px solid var(--color-border)" }}
                    >
                      <td className="px-4 py-3">
                        <Link href={`/projects/${project.id}`} className="block focus-ring rounded">
                          <div className="heading-card truncate">{project.name}</div>
                          <div className="flex items-center gap-1 text-metadata mt-0.5">
                            <span className="text-code truncate">{extractRepoDisplay(project.repositoryUrl)}</span>
                            <ExternalLinkIcon className="h-3 w-3 flex-shrink-0" style={{ color: "var(--color-text-muted)" }} />
                          </div>
                        </Link>
                      </td>
                      <td className="px-4 py-3">
                        <span className={lifecycleBadgeClass(lifecycle)}>{lifecycleLabel(lifecycle)}</span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        {latest?.evidenceStatus === "LEGACY_UNVERIFIED" ? (
                          <span className="text-metadata">Legacy — rerun required</span>
                        ) : lifecycle === "COMPLETED" && latest.riskScore != null ? (
                          <span className="text-code text-sm font-bold" style={{ color: riskColor(latest.riskScore) }}>
                            {latest.riskScore}
                          </span>
                        ) : (
                          <span style={{ color: "var(--color-text-muted)" }}>—</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {latest?.evidenceStatus !== "LEGACY_UNVERIFIED" && lifecycle === "COMPLETED" && deployment ? (
                          <span className={deploymentBadgeClass(deployment)}>{deploymentLabel(deployment)}</span>
                        ) : (
                          <span style={{ color: "var(--color-text-muted)" }}>—</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {hasAnalysis ? (
                          <span className="text-metadata whitespace-nowrap">{timeAgo(latest.createdAt)}</span>
                  ) : (
                    <span className="text-metadata">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Link
                          href={`/projects/${project.id}`}
                          className="btn btn-secondary btn-sm focus-ring whitespace-nowrap"
                        >
                          View
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Mobile cards — hidden on desktop */}
      <div className="mt-4 grid gap-3 md:hidden">
        {filtered.length === 0 ? (
          <div className="surface-card p-8 text-center">
            <FilterIcon className="mx-auto h-8 w-8" style={{ color: "var(--color-text-muted)" }} />
            <p className="heading-card mt-3">No projects match filters</p>
            <p className="mt-1 text-metadata" style={{ color: "var(--color-text-secondary)" }}>
              Try adjusting your search or filter criteria.
            </p>
          </div>
        ) : (
          filtered.map((project) => {
            const latest = project.analyses[0];
            const lifecycle = latest?.status;
            const deployment = latest?.deploymentStatus;
            const hasAnalysis = latest != null;
            return (
              <Link
                key={project.id}
                href={`/projects/${project.id}`}
                className="surface-card block p-4 focus-ring"
                style={{ textDecoration: "none" }}
              >
                <div className="flex items-start justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="heading-card truncate">{project.name}</div>
                    <div className="mt-1 flex items-center gap-1 text-metadata">
                      <span className="text-code truncate">{extractRepoDisplay(project.repositoryUrl)}</span>
                    </div>
                  </div>
                  <BarChartIcon className="h-4 w-4 flex-shrink-0" style={{ color: hasAnalysis ? "var(--color-text-muted)" : "var(--color-primary)" }} />
                </div>

                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <span className={lifecycleBadgeClass(lifecycle)}>{lifecycleLabel(lifecycle)}</span>

                  {latest?.evidenceStatus === "LEGACY_UNVERIFIED" ? (
                    <span className="text-metadata">Legacy — rerun required</span>
                  ) : lifecycle === "COMPLETED" && latest.riskScore != null && (
                    <span className="text-code text-sm font-bold" style={{ color: riskColor(latest.riskScore) }}>
                      {latest.riskScore}/100
                    </span>
                  )}

                  {latest?.evidenceStatus !== "LEGACY_UNVERIFIED" && lifecycle === "COMPLETED" && deployment && (
                    <span className={deploymentBadgeClass(deployment)}>{deploymentLabel(deployment)}</span>
                  )}
                </div>

                {hasAnalysis && (
                  <div className="mt-2 text-metadata">{timeAgo(latest.createdAt)}</div>
                )}
              </Link>
            );
          })
        )}
      </div>
    </div>
  );
}

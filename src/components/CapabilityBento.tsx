import { ShieldIcon, CheckIcon, BarChartIcon, ExternalLinkIcon } from "./icons";

export function CapabilityBento() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {/* Large feature — Isolated analyzer */}
      <div className="surface-card p-6 lg:col-span-2 lg:row-span-2">
        <div className="flex items-center gap-3">
          <div
            className="flex h-10 w-10 items-center justify-center rounded-lg"
            style={{ background: "var(--color-primary-muted)" }}
          >
            <ShieldIcon className="h-5 w-5" style={{ color: "var(--color-primary)" }} />
          </div>
          <h3 className="heading-card">Isolated Execution</h3>
        </div>
        <p
          className="mt-4 text-body"
          style={{ color: "var(--color-text-secondary)", lineHeight: 1.6 }}
        >
          Each analysis runs in a read-only Docker container with no network access,
          CPU and memory limits, and dropped capabilities. The analyzer cannot reach
          the internet, the host filesystem, or other containers.
        </p>
        <div
          className="mt-4 rounded-lg p-4 text-code text-sm"
          style={{
            background: "var(--color-surface-sunken)",
            color: "var(--color-text-secondary)",
          }}
        >
          <div>--network none</div>
          <div>--read-only</div>
          <div>--cap-drop=ALL</div>
          <div>--memory=2g --cpus=2</div>
        </div>
      </div>

      {/* Scoring panel */}
      <div className="surface-card p-6">
        <div className="flex items-center gap-3">
          <div
            className="flex h-10 w-10 items-center justify-center rounded-lg"
            style={{ background: "var(--color-primary-muted)" }}
          >
            <BarChartIcon className="h-5 w-5" style={{ color: "var(--color-primary)" }} />
          </div>
          <h3 className="heading-card">Deterministic Scoring</h3>
        </div>
        <p
          className="mt-4 text-metadata"
          style={{ color: "var(--color-text-secondary)", lineHeight: 1.5 }}
        >
          Risk score computed from persisted findings, compilation, and test results.
          Same inputs always produce the same score.
        </p>
        <div
          className="mt-4 rounded-lg p-3 text-code text-sm space-y-1"
          style={{ background: "var(--color-surface-sunken)" }}
        >
          <div className="flex justify-between">
            <span style={{ color: "var(--color-critical)" }}>CRITICAL</span>
            <span style={{ color: "var(--color-text-secondary)" }}>−30</span>
          </div>
          <div className="flex justify-between">
            <span style={{ color: "var(--color-high)" }}>HIGH</span>
            <span style={{ color: "var(--color-text-secondary)" }}>−15</span>
          </div>
          <div className="flex justify-between">
            <span style={{ color: "var(--color-medium)" }}>MEDIUM</span>
            <span style={{ color: "var(--color-text-secondary)" }}>−7</span>
          </div>
          <div className="flex justify-between">
            <span style={{ color: "var(--color-low)" }}>LOW</span>
            <span style={{ color: "var(--color-text-secondary)" }}>−2</span>
          </div>
          <div
            className="mt-2 pt-2 text-metadata"
            style={{
              borderTop: "1px solid var(--color-border)",
              color: "var(--color-text-muted)",
            }}
          >
            Compilation FAIL: −20 · Test FAIL: −10
          </div>
        </div>
      </div>

      {/* Findings panel */}
      <div className="surface-card p-6">
        <div className="flex items-center gap-3">
          <div
            className="flex h-10 w-10 items-center justify-center rounded-lg"
            style={{ background: "var(--color-primary-muted)" }}
          >
            <CheckIcon className="h-5 w-5" style={{ color: "var(--color-primary)" }} />
          </div>
          <h3 className="heading-card">Persisted Findings</h3>
        </div>
        <p
          className="mt-4 text-metadata"
          style={{ color: "var(--color-text-secondary)", lineHeight: 1.5 }}
        >
          Full finding details persisted in the database for every analysis.
        </p>
        <div
          className="mt-4 rounded-lg p-3 text-code text-sm space-y-1"
          style={{ background: "var(--color-surface-sunken)" }}
        >
          <div style={{ color: "var(--color-text-secondary)" }}>severity</div>
          <div style={{ color: "var(--color-text-secondary)" }}>type</div>
          <div style={{ color: "var(--color-text-secondary)" }}>contract</div>
          <div style={{ color: "var(--color-text-secondary)" }}>file</div>
          <div style={{ color: "var(--color-text-secondary)" }}>line</div>
          <div style={{ color: "var(--color-text-secondary)" }}>description</div>
          <div style={{ color: "var(--color-text-secondary)" }}>source</div>
        </div>
      </div>

      {/* History panel */}
      <div className="surface-card p-6">
        <div className="flex items-center gap-3">
          <div
            className="flex h-10 w-10 items-center justify-center rounded-lg"
            style={{ background: "var(--color-primary-muted)" }}
          >
            <ExternalLinkIcon className="h-5 w-5" style={{ color: "var(--color-primary)" }} />
          </div>
          <h3 className="heading-card">Historical Comparison</h3>
        </div>
        <p
          className="mt-4 text-metadata"
          style={{ color: "var(--color-text-secondary)", lineHeight: 1.5 }}
        >
          Track security posture across multiple analyses. Compare risk scores
          and finding counts over time.
        </p>
        <div
          className="mt-4 rounded-lg p-3 text-code text-sm"
          style={{ background: "var(--color-surface-sunken)" }}
        >
          <div className="flex justify-between" style={{ color: "var(--color-text-secondary)" }}>
            <span>Analysis #1</span>
            <span style={{ color: "var(--color-critical)" }}>42</span>
          </div>
          <div className="flex justify-between" style={{ color: "var(--color-text-secondary)" }}>
            <span>Analysis #2</span>
            <span style={{ color: "var(--color-medium)" }}>66</span>
          </div>
          <div className="flex justify-between" style={{ color: "var(--color-text-secondary)" }}>
            <span>Analysis #3</span>
            <span style={{ color: "var(--color-ready)" }}>85</span>
          </div>
        </div>
      </div>
    </div>
  );
}

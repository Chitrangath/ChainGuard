import Link from "next/link";
import { ShieldIcon, CheckIcon, ExternalLinkIcon } from "@/components/icons";
import { RiskIndicator } from "@/components/RiskIndicator";
import { WorkflowPipeline } from "@/components/WorkflowPipeline";
import { CapabilityBento } from "@/components/CapabilityBento";

export default function HomePage() {
  return (
    <div className="min-h-screen" style={{ background: "var(--color-background)" }}>
      {/* Hero */}
      <section className="mx-auto max-w-6xl px-4 py-16 sm:py-24">
        <div className="grid gap-12 lg:grid-cols-2 lg:items-center">
          {/* Left: Copy */}
          <div>
            <div className="text-label" style={{ color: "var(--color-primary)" }}>
              Smart Contract Security Platform
            </div>
            <h1 className="heading-display mt-4">
              Security analysis
              <br />
              you can verify.
            </h1>
            <p className="mt-4 max-w-lg text-body" style={{ color: "var(--color-text-secondary)", lineHeight: 1.6 }}>
              Automated security analysis for Solidity projects. Detect vulnerabilities,
              evaluate deployment readiness, and track security posture with deterministic,
              reproducible results.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link className="btn btn-primary btn-lg focus-ring" href="/dashboard">
                Open Dashboard
              </Link>
              <Link className="btn btn-secondary btn-lg focus-ring" href="/projects/new">
                New Project
              </Link>
            </div>
            <div className="mt-8 flex flex-wrap gap-x-6 gap-y-2">
              {["Foundry", "Slither", "Isolated Docker", "Deterministic scoring"].map((label) => (
                <div key={label} className="flex items-center gap-2 text-sm" style={{ color: "var(--color-text-secondary)" }}>
                  <ShieldIcon className="h-4 w-4" style={{ color: "var(--color-primary)" }} />
                  <span>{label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Right: Verified fixture panel — compact security report preview */}
          <div className="surface-elevated p-6">
            <div className="flex items-center justify-between">
              <div className="text-label" style={{ color: "var(--color-text-muted)" }}>
                Verified vulnerable fixture
              </div>
              <span className="text-code text-xs" style={{ color: "var(--color-text-muted)" }}>
                0x1a2b...3c4d
              </span>
            </div>

            {/* Risk + Gate */}
            <div className="mt-4 flex items-center gap-4">
              <RiskIndicator score={66} size="md" />
              <div className="divider-v h-8" />
              <span className="badge badge-blocked text-sm">BLOCKED</span>
            </div>

            {/* Compilation + Tests */}
            <div className="mt-6 grid grid-cols-2 gap-3">
              <div
                className="flex items-center gap-2 rounded-lg px-3 py-2"
                style={{ background: "var(--color-surface-sunken)" }}
              >
                <CheckIcon className="h-4 w-4 flex-shrink-0" style={{ color: "var(--color-ready)" }} />
                <div>
                  <div className="text-body font-medium">Compilation</div>
                  <div className="text-metadata" style={{ color: "var(--color-ready)" }}>PASS</div>
                </div>
              </div>
              <div
                className="flex items-center gap-2 rounded-lg px-3 py-2"
                style={{ background: "var(--color-surface-sunken)" }}
              >
                <CheckIcon className="h-4 w-4 flex-shrink-0" style={{ color: "var(--color-ready)" }} />
                <div>
                  <div className="text-body font-medium">Tests</div>
                  <div className="text-metadata" style={{ color: "var(--color-ready)" }}>3/3</div>
                </div>
              </div>
            </div>

            {/* Findings breakdown */}
            <div className="mt-4 grid grid-cols-3 gap-2">
              <div className="text-center">
                <div className="text-metric-sm" style={{ color: "var(--color-critical)" }}>1</div>
                <div className="text-metadata" style={{ color: "var(--color-text-muted)" }}>CRITICAL</div>
              </div>
              <div className="text-center">
                <div className="text-metric-sm" style={{ color: "var(--color-text-muted)" }}>0</div>
                <div className="text-metadata" style={{ color: "var(--color-text-muted)" }}>HIGH</div>
              </div>
              <div className="text-center">
                <div className="text-metric-sm" style={{ color: "var(--color-low)" }}>2</div>
                <div className="text-metadata" style={{ color: "var(--color-text-muted)" }}>LOW</div>
              </div>
            </div>

            {/* Policy explanation */}
            <div className="mt-6 divider" />
            <div className="text-metadata" style={{ lineHeight: 1.5 }}>
              Deterministic scoring: risk starts at 100. CRITICAL −30, HIGH −15, MEDIUM −7, LOW −2.
              Compilation FAIL −20, test FAIL −10. Deployment gate: BLOCKED — score below 80 or critical findings present.
            </div>
          </div>
        </div>
      </section>

      {/* How It Works — connected pipeline */}
      <section className="py-16" style={{ background: "var(--color-surface-sunken)" }}>
        <div className="mx-auto max-w-6xl px-4">
          <h2 className="heading-section text-center">How it works</h2>
          <div className="mt-10">
            <WorkflowPipeline />
          </div>
        </div>
      </section>

      {/* Capabilities — bento composition */}
      <section className="py-16">
        <div className="mx-auto max-w-6xl px-4">
          <h2 className="heading-section text-center">Capabilities</h2>
          <div className="mt-10">
            <CapabilityBento />
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8" style={{ borderTop: "1px solid var(--color-border)" }}>
        <div className="mx-auto max-w-6xl px-4 flex items-center justify-between">
          <span className="text-metadata">ChainGuard — Smart Contract DevSecOps</span>
          <a
            className="flex items-center gap-1 text-metadata focus-ring"
            style={{ color: "var(--color-text-secondary)" }}
            href="https://github.com/Chitrangath/ChainGuard"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="ChainGuard on GitHub"
          >
            GitHub
            <ExternalLinkIcon className="h-3 w-3" />
          </a>
        </div>
      </footer>
    </div>
  );
}

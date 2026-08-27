import Link from "next/link";
import { ShieldIcon } from "@/components/icons";

export default function Home() {
  return (
    <div className="flex flex-col items-center px-4 py-20 sm:py-28">
      <div className="max-w-2xl text-center">
        {/* Shield Mark */}
        <div className="flex justify-center">
          <div
            className="flex h-16 w-16 items-center justify-center rounded-2xl"
            style={{
              background: "var(--surface-primary)",
              border: "1px solid var(--border-default)",
            }}
          >
            <ShieldIcon
              className="h-8 w-8"
              style={{ color: "var(--text-primary)" }}
            />
          </div>
        </div>

        {/* Heading */}
        <h1
          className="mt-6 text-4xl font-bold tracking-tight sm:text-5xl"
          style={{ color: "var(--text-primary)" }}
        >
          ChainGuard
        </h1>
        <p
          className="mt-3 text-lg font-medium"
          style={{ color: "var(--text-primary)" }}
        >
          Smart Contract DevSecOps
        </p>
        <p
          className="mt-3 max-w-lg mx-auto text-base leading-relaxed"
          style={{ color: "var(--text-secondary)" }}
        >
          Automated security analysis for Solidity projects. Run Foundry
          compilation and tests, Slither static analysis, and receive a
          deployment readiness assessment.
        </p>

        {/* CTA */}
        <div className="mt-8">
          <Link
            href="/dashboard"
            className="btn btn-primary btn-lg focus-ring"
          >
            Open Dashboard
          </Link>
        </div>
      </div>

      {/* Capability Cards */}
      <div className="mt-16 grid max-w-3xl gap-4 sm:grid-cols-3">
        <CapabilityCard
          title="Compilation & Tests"
          description="Foundry compiles and tests your contracts in an isolated Docker container."
        />
        <CapabilityCard
          title="Static Analysis"
          description="Slither detects security vulnerabilities including reentrancy, overflow, and access control issues."
        />
        <CapabilityCard
          title="Deployment Gate"
          description="A deterministic risk score controls whether your contract is approved for deployment."
        />
      </div>
    </div>
  );
}

function CapabilityCard({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="surface-card p-5 text-center">
      <h3
        className="text-sm font-semibold"
        style={{ color: "var(--text-primary)" }}
      >
        {title}
      </h3>
      <p
        className="mt-2 text-sm leading-relaxed"
        style={{ color: "var(--text-secondary)" }}
      >
        {description}
      </p>
    </div>
  );
}

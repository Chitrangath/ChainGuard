import { ShieldIcon, CheckIcon } from "./icons";

interface Step {
  icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
  label: string;
  description: string;
}

const steps: Step[] = [
  {
    icon: ShieldIcon,
    label: "Repository",
    description: "Paste a public GitHub URL. Only HTTPS URLs from github.com are accepted.",
  },
  {
    icon: ShieldIcon,
    label: "Isolated Analyzer",
    description: "Docker container runs Foundry and Slither with no network access.",
  },
  {
    icon: CheckIcon,
    label: "Persisted Findings",
    description: "Results stored in PostgreSQL. Severity, type, source, contract, file, and line.",
  },
  {
    icon: CheckIcon,
    label: "Deployment Gate",
    description: "Deterministic risk score controls deployment readiness.",
  },
];

export function WorkflowPipeline() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {steps.map((step, i) => (
        <div key={step.label} className="relative">
          {/* Connector rail — hidden on mobile and last item */}
          {i < steps.length - 1 && (
            <div
              className="absolute top-5 left-[calc(50%+20px)] hidden h-[2px] lg:block"
              style={{
                width: "calc(100% - 40px)",
                background: "var(--color-border)",
              }}
              aria-hidden="true"
            />
          )}

          <div className="text-center">
            {/* Step indicator */}
            <div
              className="mx-auto flex h-10 w-10 items-center justify-center rounded-full"
              style={{
                background: "var(--color-primary-muted)",
                border: "2px solid var(--color-primary)",
              }}
            >
              <span className="text-code text-sm font-bold" style={{ color: "var(--color-primary)" }}>
                {i + 1}
              </span>
            </div>

            <h3 className="heading-card mt-3">{step.label}</h3>
            <p
              className="mt-2 text-metadata"
              style={{ color: "var(--color-text-secondary)", lineHeight: 1.5 }}
            >
              {step.description}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}

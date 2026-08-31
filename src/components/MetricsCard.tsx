import { CheckIcon, XIcon } from "./icons";

interface MetricsCardProps {
  label: string;
  value: string | number;
  status?: "pass" | "fail" | "neutral";
  accent?: "red" | "orange" | "yellow" | "green" | "blue";
}

const ACCENT_COLORS: Record<string, string> = {
  red: "var(--color-critical)",
  orange: "var(--color-high)",
  yellow: "var(--color-medium)",
  green: "var(--color-ready)",
  blue: "var(--color-low)",
};

export function MetricsCard({
  label,
  value,
  status = "neutral",
  accent,
}: MetricsCardProps) {
  const accentColor = accent ? ACCENT_COLORS[accent] : undefined;

  return (
    <div
      className="surface-card p-3"
      style={
        accentColor
          ? { borderLeftWidth: "2px", borderLeftColor: accentColor }
          : undefined
      }
    >
      {label && (
        <div className="text-label">{label}</div>
      )}
      <div className="mt-1 flex items-center gap-1.5">
        {status === "pass" && (
          <CheckIcon className="h-4 w-4" style={{ color: "var(--color-ready)" }} />
        )}
        {status === "fail" && (
          <XIcon className="h-4 w-4" style={{ color: "var(--color-critical)" }} />
        )}
        <span className="text-body font-semibold">{value}</span>
      </div>
    </div>
  );
}

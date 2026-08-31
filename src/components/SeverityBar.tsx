interface SeverityBarProps {
  severityCounts: {
    CRITICAL: number;
    HIGH: number;
    MEDIUM: number;
    LOW: number;
  };
  total: number;
}

export function SeverityBar({ severityCounts, total }: SeverityBarProps) {
  if (total === 0) {
    return (
      <div className="severity-bar" aria-label="No findings">
        <div className="severity-bar-segment" style={{ width: "100%", background: "var(--color-surface-sunken)" }} />
      </div>
    );
  }

  const criticalPct = (severityCounts.CRITICAL / total) * 100;
  const highPct = (severityCounts.HIGH / total) * 100;
  const mediumPct = (severityCounts.MEDIUM / total) * 100;
  const lowPct = (severityCounts.LOW / total) * 100;

  const summary = [
    severityCounts.CRITICAL > 0 && `${severityCounts.CRITICAL} critical`,
    severityCounts.HIGH > 0 && `${severityCounts.HIGH} high`,
    severityCounts.MEDIUM > 0 && `${severityCounts.MEDIUM} medium`,
    severityCounts.LOW > 0 && `${severityCounts.LOW} low`,
  ]
    .filter(Boolean)
    .join(", ");

  return (
    <div>
      <div
        className="severity-bar"
        role="img"
        aria-label={`Severity distribution: ${summary}`}
      >
        {severityCounts.CRITICAL > 0 && (
          <div
            className="severity-bar-segment severity-bar-critical"
            style={{ width: `${criticalPct}%` }}
          />
        )}
        {severityCounts.HIGH > 0 && (
          <div
            className="severity-bar-segment severity-bar-high"
            style={{ width: `${highPct}%` }}
          />
        )}
        {severityCounts.MEDIUM > 0 && (
          <div
            className="severity-bar-segment severity-bar-medium"
            style={{ width: `${mediumPct}%` }}
          />
        )}
        {severityCounts.LOW > 0 && (
          <div
            className="severity-bar-segment severity-bar-low"
            style={{ width: `${lowPct}%` }}
          />
        )}
      </div>
      <div className="sr-only">
        {total} findings: {summary}
      </div>
    </div>
  );
}

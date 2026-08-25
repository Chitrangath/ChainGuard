interface FindingTableProps {
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
}

function severityBadgeClass(severity: string): string {
  switch (severity) {
    case "CRITICAL":
      return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200";
    case "HIGH":
      return "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200";
    case "MEDIUM":
      return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200";
    case "LOW":
      return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200";
    default:
      return "bg-zinc-100 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-200";
  }
}

export function FindingTable({ findings }: FindingTableProps) {
  if (findings.length === 0) {
    return (
      <p className="text-sm text-zinc-500 dark:text-zinc-400">
        No findings detected.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-zinc-200 dark:border-zinc-800">
            <th className="px-3 py-2 text-left font-medium text-zinc-600 dark:text-zinc-400">
              Severity
            </th>
            <th className="px-3 py-2 text-left font-medium text-zinc-600 dark:text-zinc-400">
              Type
            </th>
            <th className="px-3 py-2 text-left font-medium text-zinc-600 dark:text-zinc-400">
              Contract
            </th>
            <th className="px-3 py-2 text-left font-medium text-zinc-600 dark:text-zinc-400">
              File
            </th>
            <th className="px-3 py-2 text-left font-medium text-zinc-600 dark:text-zinc-400">
              Line
            </th>
          </tr>
        </thead>
        <tbody>
          {findings.map((finding) => (
            <tr
              key={finding.id}
              className="border-b border-zinc-100 dark:border-zinc-800/50"
            >
              <td className="px-3 py-2">
                <span
                  className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${severityBadgeClass(finding.severity)}`}
                >
                  {finding.severity}
                </span>
              </td>
              <td className="px-3 py-2 text-zinc-700 dark:text-zinc-300">
                {finding.type}
              </td>
              <td className="px-3 py-2 text-zinc-600 dark:text-zinc-400">
                {finding.contract ?? "—"}
              </td>
              <td className="px-3 py-2 text-zinc-600 dark:text-zinc-400 font-mono text-xs">
                {finding.file ?? "—"}
              </td>
              <td className="px-3 py-2 text-zinc-600 dark:text-zinc-400">
                {finding.line ?? "—"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

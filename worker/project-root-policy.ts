export function selectSingleProjectRoot(roots: string[]) {
  const ordered = [...roots].sort();
  return {
    selectedRoot: ordered[0] ?? null,
    rootsDiscovered: ordered.length,
    rootsAnalyzed: ordered.length > 0 ? 1 : 0,
    incomplete: ordered.length > 1,
    reason: ordered.length > 1 ? "additional_roots_not_analyzed" : null,
  };
}

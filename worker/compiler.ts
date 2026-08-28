import type { CompilerSelection } from "./types";

const AVAILABLE_COMPILERS: Array<{ version: string; path: string }> = [
  { version: "0.8.20", path: "/usr/local/lib/solc-0.8.20" },
  { version: "0.8.24", path: "/usr/local/lib/solc-0.8.24" },
];

function parseVersion(v: string): number[] {
  return v.split(".").map(Number);
}

function versionSatisfiesRange(version: string, range: string): boolean {
  const ver = parseVersion(version);
  const rangeClean = range.trim();

  if (rangeClean.startsWith("^")) {
    const target = parseVersion(rangeClean.slice(1));
    if (ver[0] !== target[0]) return false;
    if (ver[1] > target[1]) return true;
    if (ver[1] < target[1]) return false;
    return ver[2] >= target[2];
  }

  if (rangeClean.startsWith(">=") && rangeClean.includes("<")) {
    const [gteStr, ltStr] = rangeClean.split(/\s+/);
    const gte = parseVersion(gteStr.replace(">=", ""));
    const lt = parseVersion(ltStr.replace("<", ""));
    const verNum = ver[0] * 10000 + ver[1] * 100 + ver[2];
    const gteNum = gte[0] * 10000 + gte[1] * 100 + gte[2];
    const ltNum = lt[0] * 10000 + lt[1] * 100 + lt[2];
    return verNum >= gteNum && verNum < ltNum;
  }

  if (rangeClean.startsWith(">=")) {
    const target = parseVersion(rangeClean.slice(2));
    const verNum = ver[0] * 10000 + ver[1] * 100 + ver[2];
    const targetNum = target[0] * 10000 + target[1] * 100 + target[2];
    return verNum >= targetNum;
  }

  if (rangeClean.startsWith("<")) {
    const target = parseVersion(rangeClean.slice(1));
    const verNum = ver[0] * 10000 + ver[1] * 100 + ver[2];
    const targetNum = target[0] * 10000 + target[1] * 100 + target[2];
    return verNum < targetNum;
  }

  return version === rangeClean;
}

export function parsePragma(sourceContent: string): string[] {
  const pragmas: string[] = [];
  const pragmaRegex = /pragma\s+solidity\s+([^;]+);/g;
  let match;
  while ((match = pragmaRegex.exec(sourceContent)) !== null) {
    const constraint = match[1].trim();
    if (constraint && !constraint.includes("abicoder")) {
      const parts = constraint.split(/\s+/);
      pragmas.push(...parts);
    }
  }
  return pragmas;
}

export function parseFoundryToml(content: string): {
  solcVersion: string | null;
  viaIr: boolean;
  optimizerRuns: number | null;
} {
  let solcVersion: string | null = null;
  let viaIr = false;
  let optimizerRuns: number | null = null;

  const lines = content.split("\n");
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith("solc_version")) {
      const match = trimmed.match(/solc_version\s*=\s*"([^"]+)"/);
      if (match) solcVersion = match[1];
    }
    if (trimmed.startsWith("via_ir")) {
      const match = trimmed.match(/via_ir\s*=\s*(true|false)/);
      if (match) viaIr = match[1] === "true";
    }
    if (trimmed.startsWith("optimizer_runs")) {
      const match = trimmed.match(/optimizer_runs\s*=\s*(\d+)/);
      if (match) optimizerRuns = parseInt(match[1], 10);
    }
  }

  return { solcVersion, viaIr, optimizerRuns };
}

export function selectCompiler(
  pragmas: string[],
  availablePaths?: string[],
): CompilerSelection & { version: string } {
  const available = availablePaths ?? AVAILABLE_COMPILERS.map((c) => c.path);
  const availableVersions = available.map((p) => {
    const match = p.match(/solc-([\d.]+)/);
    return match ? match[1] : "";
  }).filter(Boolean);

  if (pragmas.length === 0) {
    // No pragma — use lowest available
    const sorted = availableVersions.sort((a, b) => {
      const av = parseVersion(a);
      const bv = parseVersion(b);
      return av[0] - bv[0] || av[1] - bv[1] || av[2] - bv[2];
    });
    if (sorted.length === 0) {
      return { version: "UNSUPPORTED", path: "", viaIr: false, optimizationRuns: null };
    }
    return {
      version: sorted[0],
      path: available.find((p) => p.includes(sorted[0])) ?? "",
      viaIr: false,
      optimizationRuns: null,
    };
  }

  // Find best matching compiler — prefer lowest compatible version
  let bestMatch: string | null = null;
  let bestVersion: number[] = [Infinity, Infinity, Infinity];

  for (const availableVer of availableVersions) {
    const satisfies = pragmas.some((pragma) => versionSatisfiesRange(availableVer, pragma));
    if (satisfies) {
      const ver = parseVersion(availableVer);
      if (
        !bestMatch ||
        ver[0] < bestVersion[0] ||
        (ver[0] === bestVersion[0] && ver[1] < bestVersion[1]) ||
        (ver[0] === bestVersion[0] && ver[1] === bestVersion[1] && ver[2] < bestVersion[2])
      ) {
        bestMatch = availableVer;
        bestVersion = ver;
      }
    }
  }

  if (!bestMatch) {
    return { version: "UNSUPPORTED", path: "", viaIr: false, optimizationRuns: null };
  }

  return {
    version: bestMatch,
    path: available.find((p) => p.includes(bestMatch!)) ?? "",
    viaIr: false,
    optimizationRuns: null,
  };
}

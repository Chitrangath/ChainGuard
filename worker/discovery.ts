import * as fs from "fs";
import * as path from "path";

const EXCLUDED_DIRS = new Set([
  ".git",
  "node_modules",
  "out",
  "cache",
  "artifacts",
  "build",
  "coverage",
  "__pycache__",
  ".venv",
  "venv",
]);

const EXCLUDED_DIR_PREFIXES = ["."];

const DEFAULT_MAX_DEPTH = 6;
const DEFAULT_MAX_FILES = 500;
const DEFAULT_MAX_FILE_SIZE = 1 * 1024 * 1024; // 1MB
const DEFAULT_MAX_TOTAL_SIZE = 20 * 1024 * 1024; // 20MB

export interface DiscoveryOptions {
  maxDepth?: number;
  maxFiles?: number;
  maxFileSizeBytes?: number;
  maxTotalSourceSizeBytes?: number;
}

export interface DiscoveryResult {
  firstPartyContracts: string[];
  dependencyContracts: string[];
  generatedContracts: string[];
  projectRoots: string[];
  rejected: Array<{ filePath: string; reason: string }>;
}

function isExcludedDir(name: string): boolean {
  if (EXCLUDED_DIRS.has(name)) return true;
  if (EXCLUDED_DIR_PREFIXES.some((p) => name.startsWith(p) && name !== p)) return true;
  return false;
}

function isSymlink(filePath: string): boolean {
  try {
    const stat = fs.lstatSync(filePath);
    return stat.isSymbolicLink();
  } catch {
    return false;
  }
}

function resolveSymlinkTarget(
  linkPath: string,
  repoRoot: string,
): string | null {
  try {
    const target = fs.readlinkSync(linkPath);
    if (path.isAbsolute(target)) {
      return target;
    }
    return path.resolve(path.dirname(linkPath), target);
  } catch {
    return null;
  }
}

function isInWorkspace(resolved: string, repoRoot: string): boolean {
  const normalizedRepo = path.resolve(repoRoot);
  const normalizedTarget = path.resolve(resolved);
  return normalizedTarget.startsWith(normalizedRepo + path.sep) || normalizedTarget === normalizedRepo;
}

function isDependencyPath(relPath: string): boolean {
  return relPath.startsWith("lib/") || relPath.startsWith("lib\\");
}

function isGeneratedPath(relPath: string): boolean {
  return (
    relPath.startsWith("out/") ||
    relPath.startsWith("out\\") ||
    relPath.startsWith("artifacts/") ||
    relPath.startsWith("artifacts\\") ||
    relPath.startsWith("build/") ||
    relPath.startsWith("build\\") ||
    relPath.startsWith("cache/") ||
    relPath.startsWith("cache\\")
  );
}

function walkDir(
  dir: string,
  repoRoot: string,
  depth: number,
  opts: Required<DiscoveryOptions>,
  result: DiscoveryResult,
  currentTotalSize: number,
): number {
  if (depth > opts.maxDepth) return currentTotalSize;

  let entries: fs.Dirent[];
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return currentTotalSize;
  }

  for (const entry of entries) {
    if (result.firstPartyContracts.length +
        result.dependencyContracts.length +
        result.generatedContracts.length >= opts.maxFiles) {
      result.rejected.push({
        filePath: path.relative(repoRoot, path.join(dir, entry.name)),
        reason: "max_files_exceeded",
      });
      continue;
    }

    const fullPath = path.join(dir, entry.name);
    const relPath = path.relative(repoRoot, fullPath);

    if (entry.isDirectory()) {
      if (isExcludedDir(entry.name)) continue;
      currentTotalSize = walkDir(fullPath, repoRoot, depth + 1, opts, result, currentTotalSize);
      continue;
    }

    if (entry.isSymbolicLink()) {
      result.rejected.push({ filePath: relPath, reason: "symlink" });
      continue;
    }

    if (!entry.isFile()) continue;

    if (!entry.name.endsWith(".sol")) continue;

    let stat: fs.Stats;
    try {
      stat = fs.statSync(fullPath);
    } catch {
      continue;
    }

    if (stat.size > opts.maxFileSizeBytes) {
      result.rejected.push({ filePath: relPath, reason: "file_too_large" });
      continue;
    }

    currentTotalSize += stat.size;
    if (currentTotalSize > opts.maxTotalSourceSizeBytes) {
      result.rejected.push({ filePath: relPath, reason: "total_source_size_exceeded" });
      continue;
    }

    if (isGeneratedPath(relPath)) {
      result.generatedContracts.push(relPath);
    } else if (isDependencyPath(relPath)) {
      result.dependencyContracts.push(relPath);
    } else {
      result.firstPartyContracts.push(relPath);
    }
  }

  return currentTotalSize;
}

function findProjectRoots(repoDir: string, contracts: string[]): string[] {
  const roots = new Set<string>();

  // Check repo root
  if (fs.existsSync(path.join(repoDir, "foundry.toml")) ||
      fs.existsSync(path.join(repoDir, "hardhat.config.js")) ||
      fs.existsSync(path.join(repoDir, "hardhat.config.ts")) ||
      fs.existsSync(path.join(repoDir, "truffle-config.js"))) {
    roots.add(repoDir);
  }

  // Check directories containing foundry.toml
  for (const contract of contracts) {
    const dir = path.dirname(path.join(repoDir, contract));
    if (fs.existsSync(path.join(dir, "foundry.toml"))) {
      roots.add(dir);
    }
    // Check parent directories up to repo root
    let current = dir;
    while (current !== repoDir && current.startsWith(repoDir)) {
      if (fs.existsSync(path.join(current, "foundry.toml"))) {
        roots.add(current);
        break;
      }
      current = path.dirname(current);
    }
  }

  // If no project root found but contracts exist, use repo root
  if (roots.size === 0 && contracts.length > 0) {
    roots.add(repoDir);
  }

  return [...roots].sort();
}

export function discoverSolidityFiles(
  repoDir: string,
  options: DiscoveryOptions = {},
): DiscoveryResult {
  const opts: Required<DiscoveryOptions> = {
    maxDepth: options.maxDepth ?? DEFAULT_MAX_DEPTH,
    maxFiles: options.maxFiles ?? DEFAULT_MAX_FILES,
    maxFileSizeBytes: options.maxFileSizeBytes ?? DEFAULT_MAX_FILE_SIZE,
    maxTotalSourceSizeBytes: options.maxTotalSourceSizeBytes ?? DEFAULT_MAX_TOTAL_SIZE,
  };

  const result: DiscoveryResult = {
    firstPartyContracts: [],
    dependencyContracts: [],
    generatedContracts: [],
    projectRoots: [],
    rejected: [],
  };

  walkDir(repoDir, repoDir, 0, opts, result, 0);

  result.projectRoots = findProjectRoots(repoDir, [
    ...result.firstPartyContracts,
    ...result.dependencyContracts,
  ]);

  return result;
}

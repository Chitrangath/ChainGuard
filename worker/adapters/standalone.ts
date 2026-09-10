import * as fs from "fs";
import * as path from "path";
import { ANALYSIS_WORKSPACE_LIMIT, runBoundedProcess } from "../process-runner";
import type {
  CompilationResult,
  AnalysisTarget,
} from "../types";
import { classifyAnalyzerProcessFailure } from "../retry-policy";

const TOOL_TIMEOUT_MS = 120_000;
const ANALYZER_IMAGE = "chainguard-analyzer:latest";

interface StandardJsonInput {
  language: "Solidity";
  sources: Record<string, { content: string }>;
  settings: {
    outputSelection: Record<string, Record<string, string[]>>;
    optimizer?: { enabled: boolean; runs?: number };
  };
}

interface SourceInput {
  relativePath: string;
  absolutePath: string;
  content: string;
}

const MAX_SOURCE_FILES = 500;
const MAX_SOURCE_FILE_BYTES = 1024 * 1024;
const MAX_TOTAL_SOURCE_BYTES = 20 * 1024 * 1024;

function isContained(root: string, candidate: string): boolean {
  const relative = path.relative(root, candidate);
  return relative === "" || (!path.isAbsolute(relative) && relative !== ".." && !relative.startsWith(`..${path.sep}`));
}

function readContainedRegularFile(candidate: string, realRoot: string): SourceInput | null {
  try {
    const lexical = path.resolve(candidate);
    if (!isContained(realRoot, lexical)) return null;
    const linkStat = fs.lstatSync(lexical);
    if (linkStat.isSymbolicLink() || !linkStat.isFile() || linkStat.size > MAX_SOURCE_FILE_BYTES) return null;
    const canonical = fs.realpathSync(lexical);
    if (!isContained(realRoot, canonical)) return null;
    return {
      relativePath: path.relative(realRoot, canonical).replaceAll("\\", "/"),
      absolutePath: canonical,
      content: fs.readFileSync(canonical, "utf-8"),
    };
  } catch {
    return null;
  }
}

interface StandardJsonOutput {
  errors?: Array<{
    severity: "error" | "warning";
    message: string;
    sourceLocation?: { file: string };
  }>;
  contracts?: Record<string, Record<string, unknown>>;
}

function buildStandardJsonInput(
  sourceFiles: SourceInput[],
): StandardJsonInput {
  const sources: Record<string, { content: string }> = {};

  for (const file of sourceFiles) {
    sources[file.relativePath] = { content: file.content };
  }

  return {
    language: "Solidity",
    sources,
    settings: {
      outputSelection: {
        "*": {
          "*": ["abi", "evm.bytecode"],
        },
      },
    },
  };
}

function resolveImports(
  sourceContent: string,
  sourcePath: string,
  realRoot: string,
  visited: Set<string>,
  budget: { files: number; bytes: number },
): SourceInput[] {
  const resolved: SourceInput[] = [];
  const importRegex = /import\s+(?:.*\s+from\s+)?["']([^"']+)["']\s*;/g;
  let match;

  while ((match = importRegex.exec(sourceContent)) !== null) {
    const importPath = match[1];
    let resolvedPath: string;
    if (importPath.startsWith("./") || importPath.startsWith("../")) {
      const sourceDir = path.dirname(sourcePath);
      resolvedPath = path.resolve(sourceDir, importPath);
    } else {
      resolvedPath = path.resolve(realRoot, importPath);
    }
    const source = readContainedRegularFile(resolvedPath, realRoot);
    if (!source || visited.has(source.absolutePath)) continue;
    const bytes = Buffer.byteLength(source.content);
    if (budget.files >= MAX_SOURCE_FILES || budget.bytes + bytes > MAX_TOTAL_SOURCE_BYTES) continue;
    visited.add(source.absolutePath);
    budget.files++;
    budget.bytes += bytes;
    resolved.push(source);
    resolved.push(...resolveImports(source.content, source.absolutePath, realRoot, visited, budget));
  }

  return resolved;
}

export async function standaloneCompile(
  target: AnalysisTarget,
  workspaceDir: string,
): Promise<CompilationResult> {
  const solcPath = target.compiler.path;
  if (!solcPath) {
    return {
      status: "UNSUPPORTED",
      reasonCode: "NO_COMPILER_AVAILABLE",
      safeMessage: "No compatible Solidity compiler available",
    };
  }

  const sourceFiles: SourceInput[] = [];
  const visited = new Set<string>();
  const budget = { files: 0, bytes: 0 };
  let realRoot: string;
  try {
    realRoot = fs.realpathSync(target.root);
  } catch {
    return { status: "FAIL", reasonCode: "NO_SOURCE_FILES", safeMessage: "No source files found to compile" };
  }

  for (const relPath of target.sourcePaths) {
    const source = readContainedRegularFile(path.resolve(target.root, relPath), realRoot);
    if (!source || visited.has(source.absolutePath)) continue;
    const bytes = Buffer.byteLength(source.content);
    if (budget.files >= MAX_SOURCE_FILES || budget.bytes + bytes > MAX_TOTAL_SOURCE_BYTES) continue;
    visited.add(source.absolutePath);
    budget.files++;
    budget.bytes += bytes;
    sourceFiles.push(source);
    const imports = resolveImports(source.content, source.absolutePath, realRoot, visited, budget);
    sourceFiles.push(...imports);
  }

  if (sourceFiles.length === 0) {
    return {
      status: "FAIL",
      reasonCode: "NO_SOURCE_FILES",
      safeMessage: "No source files found to compile",
    };
  }

  const input = buildStandardJsonInput(sourceFiles);
  const inputJson = JSON.stringify(input);

  const uid = process.getuid?.() ?? 1000;
  const gid = process.getgid?.() ?? 1000;
  const relTarget = path.relative(workspaceDir, target.root);
  const containerWorkdir = `/project/${relTarget}`;
  const containerName = `chainguard-${path.basename(workspaceDir).replace(/[^a-zA-Z0-9_.-]/g, "")}-analysis`;

  try {
    const dockerArgs = [
      "run", "--rm", "-i",
      "--name", containerName,
      "--network", "none",
      "--read-only",
      "--cap-drop=ALL",
      "--security-opt=no-new-privileges",
      "--memory=2g",
      "--cpus=2",
      "--pids-limit=512",
      "--user", `${uid}:${gid}`,
      "--workdir", containerWorkdir,
      "--tmpfs", "/tmp:rw,nosuid,nodev,size=256m",
      "--env", "HOME=/tmp",
      "-v", `${workspaceDir}:/project:rw`,
      ANALYZER_IMAGE,
      solcPath, "--standard-json",
    ];

    const processResult = await runBoundedProcess("docker", dockerArgs, {
      timeoutMs: TOOL_TIMEOUT_MS, signal: target.signal, stdin: inputJson,
      workspace: { path: workspaceDir, ...ANALYSIS_WORKSPACE_LIMIT },
    });
    if (processResult.exitCode !== 0) {
      if (processResult.reasonCode) await runBoundedProcess("docker", ["rm", "-f", containerName], { timeoutMs: 10_000 });
      return { status: "FAIL", reasonCode: classifyAnalyzerProcessFailure(processResult, "COMPILER_EXECUTION_FAILED"), safeMessage: "Compiler execution failed safely" };
    }
    const stdout = processResult.stdout;

    const output: StandardJsonOutput = JSON.parse(stdout);

    const errors = output.errors ?? [];
    const compilationErrors = errors.filter((e) => e.severity === "error");

    if (compilationErrors.length > 0) {
      return {
        status: "FAIL",
        reasonCode: "COMPILATION_ERRORS",
        safeMessage: `${compilationErrors.length} compilation error(s)`,
      };
    }

    let contractsCompiled = 0;
    if (output.contracts) {
      for (const fileContracts of Object.values(output.contracts)) {
        contractsCompiled += Object.keys(fileContracts).length;
      }
    }

    if (contractsCompiled === 0) {
      return {
        status: "FAIL",
        reasonCode: "ZERO_CONTRACTS_COMPILED",
        safeMessage: "Compiler produced zero contract artifacts",
      };
    }

    return {
      status: "PASS",
      compilerVersion: target.compiler.version,
      contractsCompiled,
      contractsTargeted: sourceFiles.length,
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return {
      status: "FAIL",
      reasonCode: "COMPILER_EXECUTION_FAILED",
      safeMessage: `Compiler execution failed: ${msg.slice(0, 200)}`,
    };
  }
}

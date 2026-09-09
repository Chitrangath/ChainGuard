import * as fs from "fs";
import * as path from "path";
import { runBoundedProcess } from "../process-runner";
import type {
  CompilationResult,
  AnalysisTarget,
} from "../types";

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

interface StandardJsonOutput {
  errors?: Array<{
    severity: "error" | "warning";
    message: string;
    sourceLocation?: { file: string };
  }>;
  contracts?: Record<string, Record<string, unknown>>;
}

function buildStandardJsonInput(
  sourceFiles: Array<{ relativePath: string; absolutePath: string }>,
  workspaceDir: string,
): StandardJsonInput {
  const sources: Record<string, { content: string }> = {};

  for (const file of sourceFiles) {
    try {
      const content = fs.readFileSync(file.absolutePath, "utf-8");
      sources[file.relativePath] = { content };
    } catch {
      continue;
    }
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
  workspaceDir: string,
  visited: Set<string> = new Set(),
): Array<{ relativePath: string; absolutePath: string }> {
  const resolved: Array<{ relativePath: string; absolutePath: string }> = [];
  const importRegex = /import\s+(?:.*\s+from\s+)?["']([^"']+)["']\s*;/g;
  let match;

  while ((match = importRegex.exec(sourceContent)) !== null) {
    const importPath = match[1];
    if (visited.has(importPath)) continue;
    visited.add(importPath);

    let resolvedPath: string;
    if (importPath.startsWith("./") || importPath.startsWith("../")) {
      const sourceDir = path.dirname(sourcePath);
      resolvedPath = path.resolve(sourceDir, importPath);
    } else {
      resolvedPath = path.resolve(workspaceDir, importPath);
    }

    const relPath = path.relative(workspaceDir, resolvedPath);

    if (!resolvedPath.startsWith(workspaceDir)) {
      continue;
    }

    if (fs.existsSync(resolvedPath)) {
      resolved.push({ relativePath: relPath, absolutePath: resolvedPath });
      const content = fs.readFileSync(resolvedPath, "utf-8");
      const nested = resolveImports(content, resolvedPath, workspaceDir, visited);
      resolved.push(...nested);
    }
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

  const sourceFiles: Array<{ relativePath: string; absolutePath: string }> = [];
  const visited = new Set<string>();

  for (const relPath of target.sourcePaths) {
    const absPath = path.join(target.root, relPath);
    if (!fs.existsSync(absPath)) continue;

    sourceFiles.push({ relativePath: relPath, absolutePath: absPath });
    const content = fs.readFileSync(absPath, "utf-8");
    const imports = resolveImports(content, absPath, target.root, visited);
    sourceFiles.push(...imports);
  }

  if (sourceFiles.length === 0) {
    return {
      status: "FAIL",
      reasonCode: "NO_SOURCE_FILES",
      safeMessage: "No source files found to compile",
    };
  }

  const input = buildStandardJsonInput(sourceFiles, target.root);
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
    });
    if (processResult.exitCode !== 0) {
      if (processResult.reasonCode) await runBoundedProcess("docker", ["rm", "-f", containerName], { timeoutMs: 10_000 });
      return { status: "FAIL", reasonCode: processResult.reasonCode ?? "COMPILER_EXECUTION_FAILED", safeMessage: "Compiler execution failed safely" };
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

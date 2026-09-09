import * as fs from "fs";
import * as path from "path";
import { runBoundedProcess, type ProcessResult } from "../process-runner";
import type {
  CompilationResult,
  TestResult,
  AnalysisTarget,
} from "../types";

const TOOL_TIMEOUT_MS = 120_000;
const ANALYZER_IMAGE = "chainguard-analyzer:latest";

export async function dockerRun(
  workspaceDir: string,
  command: string[],
  outputDir?: string,
  containerWorkdir?: string,
  signal?: AbortSignal,
): Promise<ProcessResult> {
  const uid = process.getuid?.() ?? 1000;
  const gid = process.getgid?.() ?? 1000;
  const resolvedOutputDir = outputDir ?? path.join(workspaceDir, "output");
  const containerName = `chainguard-${path.basename(workspaceDir).replace(/[^a-zA-Z0-9_.-]/g, "")}-analysis`;

  const args = [
    "run",
    "--rm",
    "--name", containerName,
    "--network", "none",
    "--read-only",
    "--cap-drop=ALL",
    "--security-opt=no-new-privileges",
    "--memory=2g",
    "--cpus=2",
    "--pids-limit=512",
    "--user", `${uid}:${gid}`,
    "--workdir", containerWorkdir ?? "/project",
    "--tmpfs", "/tmp:rw,nosuid,nodev,exec,size=256m",
    "--env", "HOME=/tmp",
    "-v", `${workspaceDir}:/project:rw`,
    "-v", `${resolvedOutputDir}:/tmp/output:rw`,
    ANALYZER_IMAGE,
    ...command,
  ];

  const result = await runCommand("docker", args, { timeout: TOOL_TIMEOUT_MS, signal });
  if (result.reasonCode) await runBoundedProcess("docker", ["rm", "-f", containerName], { timeoutMs: 10_000 });
  return result;
}

async function runCommand(
  cmd: string,
  args: string[],
  opts: { cwd?: string; timeout?: number; signal?: AbortSignal } = {},
): Promise<ProcessResult> {
  return runBoundedProcess(cmd, args, { cwd: opts.cwd, timeoutMs: opts.timeout ?? TOOL_TIMEOUT_MS, signal: opts.signal });
}

export async function foundryCompile(
  target: AnalysisTarget,
  workspaceDir: string,
): Promise<CompilationResult> {
  const solcPath = target.compiler.path;
  const args = ["forge", "build"];
  if (solcPath) {
    args.push("--use", solcPath);
  }
  if (target.compiler.viaIr) {
    args.push("--via-ir");
  }

  const relTarget = path.relative(workspaceDir, target.root);
  const containerWorkdir = `/project/${relTarget}`;
  const result = await dockerRun(workspaceDir, args, undefined, containerWorkdir, target.signal);

  if (result.exitCode !== 0) {
    return {
      status: "FAIL",
      reasonCode: result.reasonCode ?? "FORGE_BUILD_FAILED",
      safeMessage: "Forge compilation failed",
    };
  }

  const contractsCompiled = countCompiledContracts(target.root);

  if (contractsCompiled === 0) {
    return {
      status: "FAIL",
      reasonCode: "ZERO_CONTRACTS_COMPILED",
      safeMessage: "Forge succeeded but compiled zero contracts",
    };
  }

  return {
    status: "PASS",
    compilerVersion: target.compiler.version,
    contractsCompiled,
    contractsTargeted: target.sourcePaths.length,
  };
}

export async function foundryTest(
  target: AnalysisTarget,
  workspaceDir: string,
): Promise<TestResult> {
  const solcPath = target.compiler.path;
  const args = ["forge", "test"];
  if (solcPath) {
    args.push("--use", solcPath);
  }

  const relTarget = path.relative(workspaceDir, target.root);
  const containerWorkdir = `/project/${relTarget}`;
  const result = await dockerRun(workspaceDir, args, undefined, containerWorkdir, target.signal);

  const testOutput = result.stdout + result.stderr;
  const counts = parseForgeTestOutput(testOutput);

  const executed =
    (counts.passedTests !== null && counts.passedTests > 0) ||
    (counts.failedTests !== null && counts.failedTests > 0) ||
    (counts.totalTests !== null && counts.totalTests > 0);

  if (!executed) {
    return { status: "NO_TESTS", reasonCode: "NO_TEST_FILES" };
  }

  const passed = counts.passedTests ?? 0;
  const failed = counts.failedTests ?? 0;
  const total = counts.totalTests ?? passed + failed;

  if (result.exitCode !== 0 && failed > 0) {
    return { status: "FAIL", totalTests: total, passedTests: passed, failedTests: failed };
  }

  if (result.exitCode !== 0) {
    return { status: "ERROR", reasonCode: result.reasonCode ?? "FORGE_TEST_ERROR", safeMessage: "Forge test exited with error" };
  }

  return { status: "PASS", totalTests: total, passedTests: passed, failedTests: 0 };
}

function parseForgeTestOutput(output: string): {
  passedTests: number | null;
  failedTests: number | null;
  totalTests: number | null;
} {
  const passedMatch = output.match(/(\d+)\s+(?:tests?\s+)?passed/);
  const failedMatch = output.match(/(\d+)\s+(?:tests?\s+)?failed/);
  const passedTests = passedMatch ? parseInt(passedMatch[1], 10) : null;
  const failedTests = failedMatch ? parseInt(failedMatch[1], 10) : null;
  const totalTests =
    passedTests !== null || failedTests !== null
      ? (passedTests ?? 0) + (failedTests ?? 0)
      : null;
  return { passedTests, failedTests, totalTests };
}

function countCompiledContracts(workspaceDir: string): number {
  const outDir = path.join(workspaceDir, "out");
  if (!fs.existsSync(outDir)) return 0;

  let count = 0;
  try {
    const entries = fs.readdirSync(outDir, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.isDirectory()) {
        const contractDir = path.join(outDir, entry.name);
        const files = fs.readdirSync(contractDir).filter((f) => f.endsWith(".json"));
        count += files.length;
      }
    }
  } catch {
    return 0;
  }
  return count;
}

export function parseTestOutput(testOutput: string): {
  passedTests: number | null;
  failedTests: number | null;
  totalTests: number | null;
} {
  return parseForgeTestOutput(testOutput);
}

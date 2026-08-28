import * as fs from "fs";
import * as path from "path";
import { execFile } from "child_process";
import { promisify } from "util";
import type {
  CompilationResult,
  TestResult,
  AnalysisTarget,
} from "../types";

const execFileAsync = promisify(execFile);
const TOOL_TIMEOUT_MS = 120_000;
const ANALYZER_IMAGE = "chainguard-analyzer:latest";

export function dockerRun(
  workspaceDir: string,
  command: string[],
  outputDir?: string,
  containerWorkdir?: string,
): Promise<{ exitCode: number; stdout: string; stderr: string }> {
  const uid = process.getuid?.() ?? 1000;
  const gid = process.getgid?.() ?? 1000;
  const resolvedOutputDir = outputDir ?? path.join(workspaceDir, "output");

  const args = [
    "run",
    "--rm",
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

  return runCommand("docker", args, { timeout: TOOL_TIMEOUT_MS });
}

async function runCommand(
  cmd: string,
  args: string[],
  opts: { cwd?: string; timeout?: number } = {},
): Promise<{ exitCode: number; stdout: string; stderr: string }> {
  try {
    const { stdout, stderr } = await execFileAsync(cmd, args, {
      cwd: opts.cwd,
      timeout: opts.timeout ?? TOOL_TIMEOUT_MS,
      maxBuffer: 50 * 1024 * 1024,
    });
    return { exitCode: 0, stdout, stderr };
  } catch (err: unknown) {
    const e = err as { code?: number; stdout?: string; stderr?: string; killed?: boolean };
    if (e.killed) {
      return { exitCode: -1, stdout: e.stdout ?? "", stderr: "TIMEOUT" };
    }
    return {
      exitCode: e.code ?? 1,
      stdout: e.stdout ?? "",
      stderr: e.stderr ?? String(err),
    };
  }
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
  const result = await dockerRun(workspaceDir, args, undefined, containerWorkdir);

  if (result.exitCode !== 0) {
    return {
      status: "FAIL",
      reasonCode: "FORGE_BUILD_FAILED",
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
  const result = await dockerRun(workspaceDir, args, undefined, containerWorkdir);

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
    return { status: "ERROR", reasonCode: "FORGE_TEST_ERROR", safeMessage: "Forge test exited with error" };
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

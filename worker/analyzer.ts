import * as fs from "fs";
import * as path from "path";
import { execFile } from "child_process";
import { promisify } from "util";
import { getDb } from "./db";
import { calculateRisk } from "../src/lib/risk-engine";
import { parseSlitherOutput } from "../src/lib/analysis-parser";
import type { Severity } from "../src/generated/prisma/enums";

const execFileAsync = promisify(execFile);

const WORKSPACE_BASE = "/tmp/guardrails";
const ANALYZER_IMAGE = "chainguard-analyzer:latest";
const SOLC_PATH = "/usr/local/lib/solc-0.8.20";
const TOOL_TIMEOUT_MS = 120_000;
const CLONE_TIMEOUT_MS = 60_000;
const OVERALL_TIMEOUT_MS = 300_000;

const GITHUB_URL_PATTERN = /^https:\/\/github\.com\/[a-zA-Z0-9._-]+\/[a-zA-Z0-9._-]+(?:\/.*)?$/;

export interface AnalysisContext {
  analysisId: string;
  projectId: string;
  repositoryUrl: string;
  projectDir: string;
}

export interface AnalysisResult {
  success: boolean;
  error?: string;
}

export function parseTestOutput(testOutput: string): {
  passedTests: number | null;
  failedTests: number | null;
  totalTests: number | null;
} {
  const passedMatch = testOutput.match(/(\d+)\s+(?:tests?\s+)?passed/);
  const failedMatch = testOutput.match(/(\d+)\s+(?:tests?\s+)?failed/);
  const passedTests = passedMatch ? parseInt(passedMatch[1], 10) : null;
  const failedTests = failedMatch ? parseInt(failedMatch[1], 10) : null;
  const totalTests =
    passedTests !== null || failedTests !== null
      ? (passedTests ?? 0) + (failedTests ?? 0)
      : null;
  return { passedTests, failedTests, totalTests };
}

function validateUrl(url: string): boolean {
  return GITHUB_URL_PATTERN.test(url);
}

function workspacePath(analysisId: string): string {
  const safeId = analysisId.replace(/[^a-zA-Z0-9_-]/g, "");
  return path.join(WORKSPACE_BASE, safeId);
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

async function dockerRun(
  workspaceDir: string,
  command: string[],
  outputDir?: string,
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
    "--workdir", "/project",
    "--tmpfs", "/tmp:rw,nosuid,nodev,exec,size=256m",
    "--env", "HOME=/tmp",
    "-v", `${workspaceDir}:/project`,
    "-v", `${resolvedOutputDir}:/tmp/output:rw`,
    ANALYZER_IMAGE,
    ...command,
  ];
  return runCommand("docker", args, { timeout: TOOL_TIMEOUT_MS });
}

async function gitClone(
  url: string,
  dest: string,
): Promise<{ exitCode: number; stderr: string }> {
  fs.mkdirSync(dest, { recursive: true });
  const result = await runCommand("git", ["clone", "--depth", "1", url, path.join(dest, "repo")], {
    timeout: CLONE_TIMEOUT_MS,
  });
  return { exitCode: result.exitCode, stderr: result.stderr };
}

function findFoundryProject(repoDir: string): string {
  // Check if foundry.toml is at repo root
  if (fs.existsSync(path.join(repoDir, "foundry.toml"))) {
    return repoDir;
  }
  // Search one level deep for foundry.toml
  const entries = fs.readdirSync(repoDir, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.isDirectory() && !entry.name.startsWith(".") && entry.name !== "node_modules") {
      const subDir = path.join(repoDir, entry.name);
      if (fs.existsSync(path.join(subDir, "foundry.toml"))) {
        return subDir;
      }
    }
  }
  // Fall back to repo root (will likely fail but preserves existing behavior)
  return repoDir;
}

export async function runAnalysis(ctx: AnalysisContext): Promise<AnalysisResult> {
  const db = getDb();
  const wsDir = workspacePath(ctx.analysisId);
  const outputDir = path.join(wsDir, "output");
  const repoDir = path.join(wsDir, "repo");

  fs.mkdirSync(outputDir, { recursive: true });

  const overallTimer = setTimeout(() => {
    cleanup(wsDir);
  }, OVERALL_TIMEOUT_MS);

  try {
    if (!validateUrl(ctx.repositoryUrl)) {
      throw new Error("Invalid repository URL");
    }

    const cloneResult = await gitClone(ctx.repositoryUrl, wsDir);
    if (cloneResult.exitCode !== 0) {
      throw new Error(`Clone failed: ${cloneResult.stderr}`);
    }

    await db.analysis.update({
      where: { id: ctx.analysisId },
      data: { status: "RUNNING", startedAt: new Date() },
    });

    const foundryDir = findFoundryProject(repoDir);
    const buildResult = await dockerRun(foundryDir, ["forge", "build", "--use", SOLC_PATH]);
    const compilationStatus = buildResult.exitCode === 0 ? "PASS" : "FAIL";

    let testStatus: "PASS" | "FAIL" = "PASS";
    let totalTests: number | null = null;
    let passedTests: number | null = null;
    let failedTests: number | null = null;

    if (compilationStatus === "PASS") {
      const testResult = await dockerRun(foundryDir, ["forge", "test", "--use", SOLC_PATH]);
      testStatus = testResult.exitCode === 0 ? "PASS" : "FAIL";

      const testOutput = testResult.stdout + testResult.stderr;
      const counts = parseTestOutput(testOutput);
      passedTests = counts.passedTests;
      failedTests = counts.failedTests;
      totalTests = counts.totalTests;
    }

    const slitherJsonPath = "/tmp/output/slither.json";
    const slitherResult = await dockerRun(foundryDir, [
      "sh", "-c",
      [
        `mkdir -p "$HOME/.svm/0.8.20"`,
        `cp /usr/local/lib/solc-0.8.20 "$HOME/.svm/0.8.20/solc-0.8.20"`,
        `chmod +x "$HOME/.svm/0.8.20/solc-0.8.20"`,
        `cp -r /root/.solc-select "$HOME/.solc-select" 2>/dev/null || true`,
        `slither . --json ${slitherJsonPath} --fail-high`,
      ].join(" && "),
    ], outputDir);

    let findings: ReturnType<typeof parseSlitherOutput> = [];
    const slitherJsonFile = path.join(outputDir, "slither.json");
    if (fs.existsSync(slitherJsonFile)) {
      const rawJson = fs.readFileSync(slitherJsonFile, "utf-8");
      findings = parseSlitherOutput(rawJson);
    } else if (slitherResult.exitCode !== 0 && slitherResult.stderr !== "TIMEOUT") {
      const stderrOutput = slitherResult.stderr;
      try {
        findings = parseSlitherOutput(stderrOutput);
      } catch {
        // slither may have written to stderr instead of file
      }
    }

    const severityCounts: Record<Severity, number> = {
      CRITICAL: 0, HIGH: 0, MEDIUM: 0, LOW: 0,
    };
    for (const f of findings) {
      severityCounts[f.severity]++;
    }

    const risk = calculateRisk({
      severityCounts,
      compilationStatus,
      testStatus,
    });

    await db.analysis.update({
      where: { id: ctx.analysisId },
      data: {
        status: "COMPLETED",
        compilationStatus,
        testStatus,
        totalTests,
        passedTests,
        failedTests,
        riskScore: risk.riskScore,
        deploymentStatus: risk.deploymentStatus,
        completedAt: new Date(),
      },
    });

    if (findings.length > 0) {
      await db.finding.createMany({
        data: findings.map((f) => ({
          analysisId: ctx.analysisId,
          severity: f.severity,
          type: f.type,
          contract: f.contract,
          file: f.file,
          line: f.line,
          description: f.description,
          source: f.source,
        })),
      });
    }

    return { success: true };
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    return { success: false, error: msg };
  } finally {
    clearTimeout(overallTimer);
    cleanup(wsDir);
  }
}

function cleanup(wsDir: string): void {
  try {
    if (fs.existsSync(wsDir)) {
      fs.rmSync(wsDir, { recursive: true, force: true });
    }
  } catch {
    // best effort cleanup
  }
}

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
): Promise<{ exitCode: number; stdout: string; stderr: string }> {
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
    "-v", `${workspaceDir}:/project:ro`,
    "-v", `${workspaceDir}/output:/tmp/output:rw`,
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

    const buildResult = await dockerRun(repoDir, ["forge", "build"]);
    const compilationStatus = buildResult.exitCode === 0 ? "PASS" : "FAIL";

    let testStatus: "PASS" | "FAIL" = "PASS";
    let totalTests: number | null = null;
    let passedTests: number | null = null;
    let failedTests: number | null = null;

    if (compilationStatus === "PASS") {
      const testResult = await dockerRun(repoDir, ["forge", "test"]);
      testStatus = testResult.exitCode === 0 ? "PASS" : "FAIL";

      const testOutput = testResult.stdout + testResult.stderr;
      const passedMatch = testOutput.match(/(\d+)\s+passing/);
      const failedMatch = testOutput.match(/(\d+)\s+failing/);
      if (passedMatch) passedTests = parseInt(passedMatch[1], 10);
      if (failedMatch) failedTests = parseInt(failedMatch[1], 10);
      if (passedTests !== null || failedTests !== null) {
        totalTests = (passedTests ?? 0) + (failedTests ?? 0);
      }
    }

    const slitherJsonPath = "/tmp/output/slither.json";
    const slitherResult = await dockerRun(repoDir, [
      "slither", ".", "--json", slitherJsonPath, "--fail-on", "high",
    ]);

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

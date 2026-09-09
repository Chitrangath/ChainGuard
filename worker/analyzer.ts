import * as fs from "fs";
import * as path from "path";
import { execFile } from "child_process";
import { promisify } from "util";
import { getDb } from "./db";
import { calculateRisk } from "../src/lib/risk-engine";
import { classifySlitherResult, parseSlitherOutput } from "../src/lib/analysis-parser";
import { discoverSolidityFiles } from "./discovery";
import { selectCompiler, parseFoundryToml, parsePragma } from "./compiler";
import { parseGitmodules, validateAllSubmodules } from "./submodule";
import { foundryCompile, foundryTest } from "./adapters/foundry";
import { standaloneCompile } from "./adapters/standalone";
import type { Severity } from "../src/generated/prisma/enums";
import type {
  ProjectType,
  CompilationResult,
  TestResult,
  StaticAnalysisResult,
  GateReason,
} from "./types";

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

export interface ForgeTestCounts {
  passedTests: number | null;
  failedTests: number | null;
  totalTests: number | null;
}

export function classifyTestResult(
  counts: ForgeTestCounts,
  forgeExitStatus: "PASS" | "FAIL",
): TestResult {
  if (forgeExitStatus === "FAIL" && counts.totalTests === null) {
    return { status: "NOT_RUN", reasonCode: "COMPILATION_FAILED" };
  }

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

  if (failed > 0) {
    return { status: "FAIL", totalTests: total, passedTests: passed, failedTests: failed };
  }

  return { status: "PASS", totalTests: total, passedTests: passed, failedTests: 0 };
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
  containerWorkdir?: string,
  environment: Record<string, string> = {},
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
    ...Object.entries(environment).flatMap(([key, value]) => ["--env", `${key}=${value}`]),
    "-v", `${workspaceDir}:/project:rw`,
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
  const result = await runCommand(
    "git",
    ["clone", "--depth", "1", url, path.join(dest, "repo")],
    { timeout: CLONE_TIMEOUT_MS },
  );
  return { exitCode: result.exitCode, stderr: result.stderr };
}

async function initSubmodules(
  repoDir: string,
  parentRepoUrl: string,
): Promise<{ success: boolean; reason?: string }> {
  const gitmodulesPath = path.join(repoDir, ".gitmodules");
  if (!fs.existsSync(gitmodulesPath)) return { success: true };

  const content = fs.readFileSync(gitmodulesPath, "utf-8");
  const entries = parseGitmodules(content);
  if (entries.length === 0) return { success: false, reason: "SUBMODULE_CONFIGURATION_INVALID" };

  const validation = validateAllSubmodules(entries, parentRepoUrl);
  if (!validation.valid) {
    return { success: false, reason: "SUBMODULE_CONFIGURATION_INVALID" };
  }

  for (const sub of validation.urls) {
    const subPath = path.join(repoDir, sub.path);
    if (fs.existsSync(subPath) && fs.lstatSync(subPath).isSymbolicLink()) {
      return { success: false, reason: "SUBMODULE_PATH_INVALID" };
    }
    const result = await runCommand(
      "git",
      [
        "-c", "protocol.file.allow=never",
        "submodule", "update", "--init", "--depth", "1",
        "--single-branch", sub.path,
      ],
      { cwd: repoDir, timeout: CLONE_TIMEOUT_MS },
    );
    if (result.exitCode !== 0) return { success: false, reason: "SUBMODULE_CHECKOUT_FAILED" };
  }
  return { success: true };
}

function classifyProject(repoDir: string, discovery: ReturnType<typeof discoverSolidityFiles>): ProjectType {
  const roots = discovery.projectRoots;
  for (const root of roots) {
    if (fs.existsSync(path.join(root, "foundry.toml"))) return "FOUNDRY";
  }

  if (fs.existsSync(path.join(repoDir, "hardhat.config.js")) ||
      fs.existsSync(path.join(repoDir, "hardhat.config.ts"))) {
    return "HARDHAT";
  }

  if (fs.existsSync(path.join(repoDir, "truffle-config.js"))) {
    return "TRUFFLE";
  }

  if (discovery.firstPartyContracts.length > 0) {
    return "STANDALONE_SOLIDITY";
  }

  return "UNKNOWN_SOLIDITY";
}

function selectTarget(
  projectType: ProjectType,
  discovery: ReturnType<typeof discoverSolidityFiles>,
  repoDir: string,
): { targetRoot: string; sourcePaths: string[] } {
  if (projectType === "FOUNDRY") {
    for (const root of discovery.projectRoots) {
      if (fs.existsSync(path.join(root, "foundry.toml"))) {
        const srcDir = path.join(root, "src");
        const testDir = path.join(root, "test");
        const sourcePaths = discovery.firstPartyContracts.filter(
          (p) => p.startsWith(path.relative(repoDir, srcDir)) ||
                 p.startsWith(path.relative(repoDir, testDir)),
        );
        return { targetRoot: root, sourcePaths };
      }
    }
  }

  return {
    targetRoot: repoDir,
    sourcePaths: discovery.firstPartyContracts,
  };
}

function buildCompilerSelection(
  projectType: ProjectType,
  targetRoot: string,
  sourcePaths: string[],
  repoDir: string,
) {
  if (projectType === "FOUNDRY") {
    const foundryTomlPath = path.join(targetRoot, "foundry.toml");
    if (fs.existsSync(foundryTomlPath)) {
      const content = fs.readFileSync(foundryTomlPath, "utf-8");
      const config = parseFoundryToml(content);
      const pragmas: string[] = [];
      if (config.solcVersion) {
        pragmas.push(config.solcVersion);
      }
      for (const relPath of sourcePaths) {
        try { pragmas.push(...parsePragma(fs.readFileSync(path.join(repoDir, relPath), "utf-8"))); } catch { continue; }
      }
      const selection = selectCompiler(pragmas);
      selection.viaIr = config.viaIr;
      selection.optimizationRuns = config.optimizerRuns;
      return selection;
    }
  }

  const pragmas: string[] = [];
  for (const relPath of sourcePaths) {
    const absPath = path.join(repoDir, relPath);
    try {
      const content = fs.readFileSync(absPath, "utf-8");
      const filePragmas = parsePragma(content);
      pragmas.push(...filePragmas);
    } catch {
      continue;
    }
  }

  return selectCompiler(pragmas);
}

async function runSlither(
  targetRoot: string,
  workspaceDir: string,
  outputDir: string,
  compilerVersion: string,
  contractsTargeted: number,
): Promise<StaticAnalysisResult> {
  const slitherJsonPath = "/tmp/output/slither.json";
  const solcFile = `/usr/local/lib/solc-${compilerVersion}`;

  const setupCmd = [
    `slither . --json ${slitherJsonPath} --fail-high --solc ${solcFile}`,
  ].join(" && ");

  const result = await dockerRun(
    workspaceDir,
    ["sh", "-c", setupCmd],
    outputDir,
    `/project/${path.relative(workspaceDir, targetRoot)}`,
    { FOUNDRY_SOLC: solcFile },
  );

  let rawJson = "";
  const slitherJsonFile = path.join(outputDir, "slither.json");
  if (fs.existsSync(slitherJsonFile)) {
    rawJson = fs.readFileSync(slitherJsonFile, "utf-8");
  }

  return classifySlitherResult(rawJson, result.exitCode, result.stderr, contractsTargeted);
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

    const submodules = await initSubmodules(repoDir, ctx.repositoryUrl);
    if (!submodules.success) {
      await db.analysis.update({ where: { id: ctx.analysisId }, data: {
        status: "COMPLETED", compilationStatus: "NOT_RUN", testStatus: "NOT_RUN",
        securityAnalysisStatus: "NOT_RUN", riskScore: null, deploymentStatus: "BLOCKED",
        coverage: "PARTIAL", gateReasons: [submodules.reason ?? "SUBMODULE_PREPARATION_FAILED"],
        evidenceVersion: 2, completedAt: new Date(),
      }});
      return { success: true };
    }

    await db.analysis.update({
      where: { id: ctx.analysisId },
      data: { status: "RUNNING", startedAt: new Date() },
    });

    const discovery = discoverSolidityFiles(repoDir);
    const projectType = classifyProject(repoDir, discovery);
    const { targetRoot, sourcePaths } = selectTarget(projectType, discovery, repoDir);

    if (sourcePaths.length === 0) {
      await db.analysis.update({
        where: { id: ctx.analysisId },
        data: {
          status: "COMPLETED",
          compilationStatus: "NOT_RUN",
          testStatus: "NOT_RUN",
          securityAnalysisStatus: "NO_CONTRACTS_FOUND",
          coverage: "FAILED",
          projectType,
          contractsDiscovered: 0,
          riskScore: null,
          deploymentStatus: "BLOCKED",
          gateReasons: ["NO_CONTRACTS_FOUND"],
          evidenceVersion: 2,
          completedAt: new Date(),
        },
      });
      return { success: true };
    }

    const compilerSelection = buildCompilerSelection(projectType, targetRoot, sourcePaths, repoDir);

    let compilation: CompilationResult;
    if (compilerSelection.version === "UNSUPPORTED") {
      compilation = {
        status: "UNSUPPORTED",
        reasonCode: "UNSUPPORTED_COMPILER",
        safeMessage: `No compatible compiler for requested version`,
      };
    } else if (projectType === "FOUNDRY") {
      compilation = await foundryCompile(
        {
          root: targetRoot,
          projectType: "FOUNDRY",
          sourcePaths,
          configPath: path.join(targetRoot, "foundry.toml"),
          compiler: compilerSelection,
          testAvailability: { hasTests: sourcePaths.some((p) => p.includes("test")), testPaths: [] },
          dependencyStrategy: { type: "foundry_lib", paths: ["lib"] },
        },
        wsDir,
      );
    } else {
      compilation = await standaloneCompile(
        {
          root: targetRoot,
          projectType: "STANDALONE_SOLIDITY",
          sourcePaths,
          configPath: null,
          compiler: compilerSelection,
          testAvailability: { hasTests: false, testPaths: [] },
          dependencyStrategy: { type: "none", paths: [] },
        },
        wsDir,
      );
    }

    let tests: TestResult;
    if (compilation.status !== "PASS") {
      tests = { status: "NOT_RUN", reasonCode: "COMPILATION_FAILED" };
    } else if (projectType === "FOUNDRY") {
      tests = await foundryTest(
        {
          root: targetRoot,
          projectType: "FOUNDRY",
          sourcePaths,
          configPath: path.join(targetRoot, "foundry.toml"),
          compiler: compilerSelection,
          testAvailability: { hasTests: true, testPaths: [] },
          dependencyStrategy: { type: "foundry_lib", paths: ["lib"] },
        },
        wsDir,
      );
    } else {
      tests = { status: "NO_TESTS", reasonCode: "NO_TEST_FRAMEWORK" };
    }

    const contractsTargeted = compilation.status === "PASS" ? compilation.contractsCompiled : sourcePaths.length;

    let staticAnalysis: StaticAnalysisResult;
    if (compilation.status !== "PASS") {
      staticAnalysis = { status: "NOT_RUN", reasonCode: "COMPILATION_FAILED", safeMessage: "Compilation failed, Slither skipped" };
    } else {
      staticAnalysis = await runSlither(targetRoot, wsDir, outputDir, compilerSelection.version, contractsTargeted);
    }

    const securityAnalysisStatus = staticAnalysis.status === "PASS" ? "PASS" :
      staticAnalysis.status === "FAIL" ? "FAIL" : "NOT_RUN";

    let coverage: "FULL" | "PARTIAL" | "FAILED" = "FULL";
    if (compilation.status !== "PASS" || staticAnalysis.status !== "PASS") {
      coverage = "PARTIAL";
    }
    if (projectType === "UNKNOWN_SOLIDITY" || compilation.status === "UNSUPPORTED") {
      coverage = "FAILED";
    }

    const severityCounts: Record<Severity, number> = {
      CRITICAL: 0, HIGH: 0, MEDIUM: 0, LOW: 0,
    };
    const findings = staticAnalysis.status === "PASS" ? staticAnalysis.findings : [];
    const scoredFindings = findings.filter((finding) => finding.scope === "FIRST_PARTY");
    for (const f of scoredFindings) {
      severityCounts[f.severity]++;
    }

    const risk = calculateRisk({
      severityCounts,
      compilationStatus: compilation.status,
      testStatus: tests.status,
      securityAnalysisStatus,
      coverage,
    });

    const totalTests = tests.status === "PASS" || tests.status === "FAIL" ? tests.totalTests : null;
    const passedTests = tests.status === "PASS" || tests.status === "FAIL" ? tests.passedTests : null;
    const failedTests = tests.status === "PASS" || tests.status === "FAIL" ? tests.failedTests : null;

    await db.analysis.update({
      where: { id: ctx.analysisId },
      data: {
        status: "COMPLETED",
        compilationStatus: compilation.status,
        testStatus: tests.status,
        totalTests,
        passedTests,
        failedTests,
        riskScore: risk.riskScore,
        deploymentStatus: risk.deploymentStatus,
        projectType,
        compilerVersion: compilation.status === "PASS" ? compilation.compilerVersion : null,
        contractsDiscovered: discovery.firstPartyContracts.length,
        contractsCompiled: compilation.status === "PASS" ? compilation.contractsCompiled : null,
        contractsTargetedForScan: contractsTargeted,
        securityAnalysisStatus,
        gateReasons: risk.gateReasons,
        coverage,
        evidenceVersion: 2,
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
          scope: f.scope,
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

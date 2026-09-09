import "dotenv/config";
import { getDb, closeDb } from "./db";
import { runAnalysis, type AnalysisContext } from "./analyzer";
import { failureTransition, staleTransition } from "./job-lifecycle";
import { runBoundedProcess } from "./process-runner";
import * as fs from "node:fs";
import * as path from "node:path";

const POLL_INTERVAL_MS = 3000;
const STALE_THRESHOLD_MS = 7 * 60 * 1000; // overall timeout plus cleanup grace
const WORKSPACE_BASE = "/tmp/guardrails";

let running = true;

function log(msg: string) {
  const ts = new Date().toISOString();
  console.log(`[${ts}] ${msg}`);
}

async function claimJob() {
  const db = getDb();

  // Atomic claim: find one QUEUED job and atomically set it to RUNNING.
  // Uses a transaction with FOR UPDATE SKIP LOCKED to prevent double-claims.
  const result = await db.$transaction(async (tx) => {
    const rows = await tx.$queryRawUnsafe<{ id: string; projectId: string; attemptCount: number }[]>(
      `SELECT id, "projectId", "attemptCount" FROM analyses
       WHERE status = 'QUEUED'
         AND ("nextAttemptAt" IS NULL OR "nextAttemptAt" <= NOW())
       ORDER BY "createdAt" ASC
       LIMIT 1
       FOR UPDATE SKIP LOCKED`,
    );

    if (rows.length === 0) return null;

    const job = rows[0];

    await tx.analysis.update({
      where: { id: job.id },
      data: {
        status: "RUNNING",
        startedAt: new Date(),
        lastAttemptAt: new Date(),
        nextAttemptAt: null,
        attemptCount: { increment: 1 },
      },
    });

    return { id: job.id, projectId: job.projectId, attemptCount: job.attemptCount + 1 };
  });

  return result;
}

async function processJob(job: { id: string; projectId: string; attemptCount: number }) {
  const db = getDb();

  log(`Processing analysis ${job.id} for project ${job.projectId}`);

  try {
    const project = await db.project.findUnique({
      where: { id: job.projectId },
      select: { repositoryUrl: true },
    });

    if (!project) {
      throw new Error(`Project ${job.projectId} not found`);
    }

    const ctx: AnalysisContext = {
      analysisId: job.id,
      projectId: job.projectId,
      repositoryUrl: project.repositoryUrl,
      projectDir: "",
    };

    const result = await runAnalysis(ctx);

    if (result.success) {
      log(`Analysis ${job.id} completed`);
    } else {
      await db.analysis.update({
        where: { id: job.id },
        data: failureTransition(result.error ?? "ANALYSIS_EXECUTION_FAILED", job.attemptCount, new Date()),
      });
      log(`Analysis ${job.id} infrastructure failure: ${result.error}`);
    }
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    log(`Analysis ${job.id} encountered error: ${msg}`);

    try {
      await db.analysis.update({
        where: { id: job.id },
        data: failureTransition("ANALYSIS_EXECUTION_FAILED", job.attemptCount, new Date()),
      });
    } catch (updateError) {
      log(`Failed to mark analysis ${job.id} as FAILED: ${updateError}`);
    }
  }
}

async function checkStaleJobs() {
  const db = getDb();

  try {
    const staleThreshold = new Date(Date.now() - STALE_THRESHOLD_MS);

    const staleJobs = await db.analysis.findMany({
      where: {
        status: "RUNNING",
        startedAt: { lt: staleThreshold },
      },
      select: { id: true, attemptCount: true },
    });
    let recovered = 0;
    for (const job of staleJobs) {
      const safeId = path.basename(job.id).replace(/[^a-zA-Z0-9_.-]/g, "");
      if (safeId !== job.id) continue;
      await runBoundedProcess("docker", ["rm", "-f", `chainguard-${safeId}-analysis`], { timeoutMs: 10_000 });
      const workspace = path.join(WORKSPACE_BASE, safeId);
      if (workspace.startsWith(`${WORKSPACE_BASE}${path.sep}`)) {
        fs.rmSync(workspace, { recursive: true, force: true });
      }
      const result = await db.analysis.updateMany({
        where: { id: job.id, status: "RUNNING" },
        data: staleTransition(job.attemptCount, new Date()),
      });
      recovered += result.count;
    }
    if (recovered > 0) {
      log(`Recovered ${recovered} stale RUNNING job(s)`);
    }
  } catch (error) {
    log(`Error checking stale jobs: ${error}`);
  }
}

async function poll() {
  while (running) {
    try {
      await checkStaleJobs();

      const job = await claimJob();
      if (job) {
        await processJob(job);
      } else {
        await sleep(POLL_INTERVAL_MS);
      }
    } catch (error) {
      log(`Poll cycle error: ${error}`);
      await sleep(POLL_INTERVAL_MS);
    }
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function shutdown() {
  log("Shutting down worker...");
  running = false;
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

async function main() {
  log("ChainGuard worker starting...");
  log(`Poll interval: ${POLL_INTERVAL_MS}ms`);
  log(`Stale threshold: ${STALE_THRESHOLD_MS}ms`);

  await poll();

  await closeDb();
  log("Worker stopped");
}

main().catch((error) => {
  console.error("Fatal worker error:", error);
  process.exit(1);
});

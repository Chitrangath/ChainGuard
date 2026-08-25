import "dotenv/config";
import { getDb, closeDb } from "./db";
import { runAnalysis, type AnalysisContext } from "./analyzer";

const POLL_INTERVAL_MS = 3000;
const STALE_THRESHOLD_MS = 5 * 60 * 1000; // 5 minutes

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
    const rows = await tx.$queryRawUnsafe<{ id: string; projectId: string }[]>(
      `SELECT id, "projectId" FROM analyses
       WHERE status = 'QUEUED'
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
      },
    });

    return { id: job.id, projectId: job.projectId };
  });

  return result;
}

async function processJob(job: { id: string; projectId: string }) {
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
      projectDir: "", // Will be set when git clone is implemented in Phase 4
    };

    const result = await runAnalysis(ctx);

    if (result.success) {
      await db.analysis.update({
        where: { id: job.id },
        data: {
          status: "COMPLETED",
          completedAt: new Date(),
        },
      });
      log(`Analysis ${job.id} completed successfully`);
    } else {
      await db.analysis.update({
        where: { id: job.id },
        data: {
          status: "FAILED",
          completedAt: new Date(),
        },
      });
      log(`Analysis ${job.id} failed: ${result.error}`);
    }
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    log(`Analysis ${job.id} encountered error: ${msg}`);

    try {
      await db.analysis.update({
        where: { id: job.id },
        data: {
          status: "FAILED",
          completedAt: new Date(),
        },
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

    const staleCount = await db.analysis.updateMany({
      where: {
        status: "RUNNING",
        startedAt: { lt: staleThreshold },
      },
      data: {
        status: "FAILED",
        completedAt: new Date(),
      },
    });

    if (staleCount.count > 0) {
      log(`Marked ${staleCount.count} stale RUNNING job(s) as FAILED`);
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

import { afterEach, describe, expect, it } from "vitest";
import "dotenv/config";
import { enqueueAnalysis } from "../analysis-queue";

const integration = process.env.RUN_DB_INTEGRATION === "1" ? describe : describe.skip;
const projectIds: string[] = [];

afterEach(async () => {
  if (process.env.RUN_DB_INTEGRATION !== "1") return;
  const { db } = await import("../db");
  for (const id of projectIds.splice(0)) await db.project.delete({ where: { id } }).catch(() => undefined);
});

integration("analysis queue database concurrency", () => {
  it("creates only one active analysis for concurrent requests", async () => {
    const { db } = await import("../db");
    const project = await db.project.create({ data: {
      name: `queue-race-${Date.now()}`,
      repositoryUrl: "https://github.com/octocat/Hello-World",
    } });
    projectIds.push(project.id);
    const [first, second] = await Promise.all([
      enqueueAnalysis(db, project.id),
      enqueueAnalysis(db, project.id),
    ]);
    expect(first.kind).toBe("created");
    expect(second.kind).toBe("existing");
    if ("analysis" in first && "analysis" in second) expect(second.analysis.id).toBe(first.analysis.id);
    await expect(db.analysis.count({ where: { projectId: project.id, status: { in: ["QUEUED", "RUNNING"] } } })).resolves.toBe(1);
  });
});

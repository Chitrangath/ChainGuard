import { describe, expect, it } from "vitest";
import { enqueueAnalysis, MAX_ACTIVE_ANALYSES } from "../analysis-queue";

function fakeQueue(options: { project?: boolean; active?: { id: string; status: string } | null; count?: number } = {}) {
  let created = 0;
  const tx = {
    $executeRawUnsafe: async () => 1,
    project: { findUnique: async () => options.project === false ? null : { id: "project-1" } },
    analysis: {
      findFirst: async () => options.active ?? null,
      count: async () => options.count ?? 0,
      create: async () => { created++; return { id: "new-analysis", status: "QUEUED" }; },
    },
  };
  return { db: { $transaction: async <T>(fn: (value: typeof tx) => Promise<T>) => fn(tx) }, created: () => created };
}

describe("analysis queue", () => {
  it("returns the existing active analysis instead of creating a duplicate", async () => {
    const state = fakeQueue({ active: { id: "active-analysis", status: "RUNNING" } });
    await expect(enqueueAnalysis(state.db, "project-1")).resolves.toEqual({
      kind: "existing", analysis: { id: "active-analysis", status: "RUNNING" },
    });
    expect(state.created()).toBe(0);
  });

  it("creates a deliberate fresh run after completed work when capacity exists", async () => {
    const state = fakeQueue();
    await expect(enqueueAnalysis(state.db, "project-1")).resolves.toMatchObject({ kind: "created" });
    expect(state.created()).toBe(1);
  });

  it("rejects new work at the active queue capacity", async () => {
    const state = fakeQueue({ count: MAX_ACTIVE_ANALYSES });
    await expect(enqueueAnalysis(state.db, "project-1")).resolves.toEqual({ kind: "capacity" });
  });
});

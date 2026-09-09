import { CURRENT_EVIDENCE_VERSION } from "./evidence";

export const MAX_ACTIVE_ANALYSES = 25;
const QUEUE_LOCK_ID = 11235813;

type QueueTransaction = {
  $executeRawUnsafe(query: string): Promise<unknown>;
  project: { findUnique(args: unknown): Promise<{ id: string } | null> };
  analysis: {
    findFirst(args: unknown): Promise<{ id: string; status: string } | null>;
    count(args: unknown): Promise<number>;
    create(args: unknown): Promise<{ id: string; status: string }>;
  };
};

type QueueDb = {
  $transaction<T>(fn: (tx: QueueTransaction) => Promise<T>): Promise<T>;
};

export type EnqueueResult =
  | { kind: "missing" }
  | { kind: "capacity" }
  | { kind: "existing" | "created"; analysis: { id: string; status: string } };

export async function enqueueAnalysis(db: QueueDb, projectId: string): Promise<EnqueueResult> {
  return db.$transaction(async (tx) => {
    await tx.$executeRawUnsafe(`SELECT pg_advisory_xact_lock(${QUEUE_LOCK_ID})`);
    const project = await tx.project.findUnique({ where: { id: projectId }, select: { id: true } });
    if (!project) return { kind: "missing" };
    const active = await tx.analysis.findFirst({
      where: { projectId, status: { in: ["QUEUED", "RUNNING"] } },
      orderBy: [{ createdAt: "asc" }, { id: "asc" }],
      select: { id: true, status: true },
    });
    if (active) return { kind: "existing", analysis: active };
    const activeCount = await tx.analysis.count({ where: { status: { in: ["QUEUED", "RUNNING"] } } });
    if (activeCount >= MAX_ACTIVE_ANALYSES) return { kind: "capacity" };
    const analysis = await tx.analysis.create({
      data: { projectId, status: "QUEUED", evidenceVersion: CURRENT_EVIDENCE_VERSION },
      select: { id: true, status: true },
    });
    return { kind: "created", analysis };
  });
}

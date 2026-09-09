ALTER TABLE "analyses"
ADD COLUMN "attemptCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "lastAttemptAt" TIMESTAMP(3),
ADD COLUMN "nextAttemptAt" TIMESTAMP(3),
ADD COLUMN "lastSafeReason" TEXT,
ADD COLUMN "terminalReason" TEXT,
ADD COLUMN "projectRootsDiscovered" INTEGER,
ADD COLUMN "projectRootsAnalyzed" INTEGER;

CREATE INDEX "analyses_status_nextAttemptAt_createdAt_idx"
ON "analyses"("status", "nextAttemptAt", "createdAt");

CREATE UNIQUE INDEX "analyses_one_active_per_project_idx"
ON "analyses"("projectId")
WHERE "status" IN ('QUEUED', 'RUNNING');

CREATE TYPE "finding_scope" AS ENUM ('FIRST_PARTY', 'DEPENDENCY', 'GENERATED', 'UNKNOWN');

ALTER TABLE "analyses" ADD COLUMN "evidenceVersion" INTEGER;
ALTER TABLE "findings" ADD COLUMN "scope" "finding_scope" NOT NULL DEFAULT 'UNKNOWN';

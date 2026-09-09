ALTER TABLE "analyses"
ADD COLUMN "firstPartySourcesDiscovered" INTEGER,
ADD COLUMN "dependencySourcesDiscovered" INTEGER,
ADD COLUMN "generatedSourcesDiscovered" INTEGER,
ADD COLUMN "firstPartySourcesTargeted" INTEGER,
ADD COLUMN "filesScanned" INTEGER,
ADD COLUMN "sourcesRejected" INTEGER,
ADD COLUMN "discoveryReasons" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
ADD COLUMN "failureReason" TEXT;

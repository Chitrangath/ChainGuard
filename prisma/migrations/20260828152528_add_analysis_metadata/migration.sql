-- CreateEnum
CREATE TYPE "project_type" AS ENUM ('FOUNDRY', 'HARDHAT', 'TRUFFLE', 'STANDALONE_SOLIDITY', 'UNKNOWN_SOLIDITY');

-- CreateEnum
CREATE TYPE "security_analysis_status" AS ENUM ('PASS', 'FAIL', 'NOT_RUN', 'UNSUPPORTED', 'NO_CONTRACTS_FOUND');

-- CreateEnum
CREATE TYPE "analysis_coverage" AS ENUM ('FULL', 'PARTIAL', 'FAILED');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "compilation_status" ADD VALUE 'NOT_RUN';
ALTER TYPE "compilation_status" ADD VALUE 'UNSUPPORTED';

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "test_status" ADD VALUE 'NO_TESTS';
ALTER TYPE "test_status" ADD VALUE 'NOT_RUN';
ALTER TYPE "test_status" ADD VALUE 'ERROR';

-- AlterTable
ALTER TABLE "analyses" ADD COLUMN     "compilerVersion" TEXT,
ADD COLUMN     "contractsCompiled" INTEGER,
ADD COLUMN     "contractsDiscovered" INTEGER,
ADD COLUMN     "contractsTargetedForScan" INTEGER,
ADD COLUMN     "coverage" "analysis_coverage",
ADD COLUMN     "gateReasons" TEXT[],
ADD COLUMN     "projectType" "project_type",
ADD COLUMN     "securityAnalysisStatus" "security_analysis_status";

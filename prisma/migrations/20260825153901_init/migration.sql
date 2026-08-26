-- CreateEnum
CREATE TYPE "analysis_status" AS ENUM ('QUEUED', 'RUNNING', 'COMPLETED', 'FAILED');

-- CreateEnum
CREATE TYPE "deployment_status" AS ENUM ('READY', 'BLOCKED');

-- CreateEnum
CREATE TYPE "compilation_status" AS ENUM ('PASS', 'FAIL');

-- CreateEnum
CREATE TYPE "test_status" AS ENUM ('PASS', 'FAIL');

-- CreateEnum
CREATE TYPE "severity" AS ENUM ('CRITICAL', 'HIGH', 'MEDIUM', 'LOW');

-- CreateTable
CREATE TABLE "projects" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "repositoryUrl" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "projects_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "analyses" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "status" "analysis_status" NOT NULL DEFAULT 'QUEUED',
    "riskScore" INTEGER,
    "deploymentStatus" "deployment_status",
    "compilationStatus" "compilation_status",
    "testStatus" "test_status",
    "totalTests" INTEGER,
    "passedTests" INTEGER,
    "failedTests" INTEGER,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "analyses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "findings" (
    "id" TEXT NOT NULL,
    "analysisId" TEXT NOT NULL,
    "severity" "severity" NOT NULL,
    "type" TEXT NOT NULL,
    "contract" TEXT,
    "file" TEXT,
    "line" INTEGER,
    "description" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "findings_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "analyses" ADD CONSTRAINT "analyses_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "findings" ADD CONSTRAINT "findings_analysisId_fkey" FOREIGN KEY ("analysisId") REFERENCES "analyses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

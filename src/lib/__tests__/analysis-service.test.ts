import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../db", () => ({
  db: {
    analysis: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
    },
    finding: {
      findMany: vi.fn(),
      count: vi.fn(),
    },
  },
}));

vi.mock("../analysis-cache", () => ({
  getCachedAnalysis: vi.fn().mockResolvedValue(null),
  setCachedAnalysis: vi.fn().mockResolvedValue(undefined),
  isTerminal: vi.fn((status: string) => status === "COMPLETED" || status === "FAILED"),
}));

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyAnalysis = any;

describe("analysis-service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getAnalysisById", () => {
    it("returns null when analysis not found", async () => {
      const { db } = await import("../db");
      vi.mocked(db.analysis.findUnique).mockResolvedValue(null);

      const { getAnalysisById } = await import("../analysis-service");
      const result = await getAnalysisById("nonexistent");
      expect(result).toBeNull();
    });

    it("returns analysis when found", async () => {
      const mockAnalysis = {
        id: "test-id",
        projectId: "proj-id",
        status: "COMPLETED",
        riskScore: 85,
        deploymentStatus: "READY",
        compilationStatus: "PASS",
        testStatus: "PASS",
        totalTests: 3,
        passedTests: 3,
        failedTests: 0,
        startedAt: new Date("2024-01-01T00:00:00Z"),
        completedAt: new Date("2024-01-01T00:01:00Z"),
        createdAt: new Date("2024-01-01T00:00:00Z"),
        evidenceVersion: 2,
        findings: [{ id: "f1" }, { id: "f2" }],
      };

      const { db } = await import("../db");
      vi.mocked(db.analysis.findUnique).mockResolvedValue(mockAnalysis as AnyAnalysis);

      const { getAnalysisById } = await import("../analysis-service");
      const result = await getAnalysisById("test-id");

      expect(result).not.toBeNull();
      expect(result?.id).toBe("test-id");
      expect(result?.findingCount).toBe(2);
      expect(result?.evidenceStatus).toBe("VERIFIED");
      const { setCachedAnalysis } = await import("../analysis-cache");
      expect(setCachedAnalysis).toHaveBeenCalledWith("test-id", expect.objectContaining({ findingCount: 2, findings: [] }));
    });

    it("qualifies legacy analysis and suppresses its historical score", async () => {
      const { db } = await import("../db");
      vi.mocked(db.analysis.findUnique).mockResolvedValue({
        id: "legacy-id",
        projectId: "proj-id",
        status: "COMPLETED",
        riskScore: 80,
        deploymentStatus: "BLOCKED",
        compilationStatus: "FAIL",
        testStatus: "PASS",
        totalTests: null,
        passedTests: null,
        failedTests: null,
        startedAt: null,
        completedAt: new Date("2024-01-01T00:01:00Z"),
        createdAt: new Date("2024-01-01T00:00:00Z"),
        evidenceVersion: null,
        findings: [],
      } as AnyAnalysis);

      const { getAnalysisById } = await import("../analysis-service");
      const result = await getAnalysisById("legacy-id");
      expect(result).toMatchObject({
        riskScore: null,
        deploymentStatus: "BLOCKED",
        evidenceStatus: "LEGACY_UNVERIFIED",
        compilationStatus: null,
        testStatus: null,
        securityAnalysisStatus: null,
        gateReasons: ["INCOMPLETE_ANALYSIS"],
      });
    });

    it("validates project ownership when projectId provided", async () => {
      const mockAnalysis = {
        id: "test-id",
        projectId: "other-proj",
        status: "COMPLETED",
        riskScore: 85,
        deploymentStatus: "READY",
        compilationStatus: "PASS",
        testStatus: "PASS",
        totalTests: 3,
        passedTests: 3,
        failedTests: 0,
        startedAt: new Date("2024-01-01T00:00:00Z"),
        completedAt: new Date("2024-01-01T00:01:00Z"),
        createdAt: new Date("2024-01-01T00:00:00Z"),
        evidenceVersion: 2,
        findings: [],
      };

      const { db } = await import("../db");
      vi.mocked(db.analysis.findUnique).mockResolvedValue(mockAnalysis as AnyAnalysis);

      const { getAnalysisById } = await import("../analysis-service");
      const result = await getAnalysisById("test-id", "expected-proj");

      expect(result).toBeNull();
    });
  });

  describe("getAnalysisWithFindings", () => {
    it("returns null when analysis not found", async () => {
      const { db } = await import("../db");
      vi.mocked(db.analysis.findFirst).mockResolvedValue(null);

      const { getAnalysisWithFindings } = await import("../analysis-service");
      const result = await getAnalysisWithFindings("nonexistent", "proj-id");
      expect(result).toBeNull();
    });

    it("returns analysis with findings", async () => {
      const mockAnalysis = {
        id: "test-id",
        projectId: "proj-id",
        status: "COMPLETED",
        riskScore: 85,
        deploymentStatus: "READY",
        compilationStatus: "PASS",
        testStatus: "PASS",
        totalTests: 3,
        passedTests: 3,
        failedTests: 0,
        startedAt: new Date("2024-01-01T00:00:00Z"),
        completedAt: new Date("2024-01-01T00:01:00Z"),
        createdAt: new Date("2024-01-01T00:00:00Z"),
        evidenceVersion: 2,
        findings: [
          {
            id: "f1",
            severity: "CRITICAL",
            type: "reentrancy",
            contract: "Vault",
            file: "src/Vault.sol",
            line: 42,
            description: "Reentrancy vulnerability",
            source: "slither",
            scope: "FIRST_PARTY",
          },
        ],
      };

      const { db } = await import("../db");
      vi.mocked(db.analysis.findFirst).mockResolvedValue(mockAnalysis as AnyAnalysis);
      vi.mocked(db.finding.findMany).mockResolvedValue(mockAnalysis.findings as AnyAnalysis);
      vi.mocked(db.finding.count).mockResolvedValue(1);

      const { getAnalysisWithFindings } = await import("../analysis-service");
      const result = await getAnalysisWithFindings("test-id", "proj-id");

      expect(result).not.toBeNull();
      expect(result?.findings).toHaveLength(1);
      expect(result?.findings[0].severity).toBe("CRITICAL");
      expect(result?.findingsPagination).toEqual({ page: 1, pageSize: 25, total: 1, totalPages: 1, severity: null });
    });

    it("does not expose historic findings for a legacy analysis", async () => {
      const { db } = await import("../db");
      vi.mocked(db.analysis.findFirst).mockResolvedValue({
        id: "legacy-id", projectId: "proj-id", status: "COMPLETED",
        riskScore: 90, deploymentStatus: "READY", compilationStatus: "PASS", testStatus: "PASS",
        totalTests: 3, passedTests: 3, failedTests: 0, startedAt: null, completedAt: null,
        createdAt: new Date("2024-01-01T00:00:00Z"), evidenceVersion: null,
      } as AnyAnalysis);

      const { getAnalysisWithFindings } = await import("../analysis-service");
      const result = await getAnalysisWithFindings("legacy-id", "proj-id");

      expect(result).toMatchObject({
        evidenceStatus: "LEGACY_UNVERIFIED",
        compilationStatus: null,
        testStatus: null,
        findingCount: null,
        findings: [],
        findingsPagination: { total: 0, totalPages: 0 },
      });
      expect(db.finding.findMany).not.toHaveBeenCalled();
    });
  });
});

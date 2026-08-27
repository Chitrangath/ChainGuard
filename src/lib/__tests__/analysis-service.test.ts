import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock the database and cache modules
vi.mock("../db", () => ({
  db: {
    analysis: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
    },
  },
}));

vi.mock("../analysis-cache", () => ({
  getCachedAnalysis: vi.fn().mockResolvedValue(null),
  setCachedAnalysis: vi.fn().mockResolvedValue(undefined),
  isTerminal: vi.fn((status: string) => status === "COMPLETED" || status === "FAILED"),
}));

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
        findings: [{ id: "f1" }, { id: "f2" }],
      };

      const { db } = await import("../db");
      vi.mocked(db.analysis.findUnique).mockResolvedValue(mockAnalysis as any);

      const { getAnalysisById } = await import("../analysis-service");
      const result = await getAnalysisById("test-id");

      expect(result).not.toBeNull();
      expect(result?.id).toBe("test-id");
      expect(result?.findingCount).toBe(2);
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
        findings: [],
      };

      const { db } = await import("../db");
      vi.mocked(db.analysis.findUnique).mockResolvedValue(mockAnalysis as any);

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
          },
        ],
      };

      const { db } = await import("../db");
      vi.mocked(db.analysis.findFirst).mockResolvedValue(mockAnalysis as any);

      const { getAnalysisWithFindings } = await import("../analysis-service");
      const result = await getAnalysisWithFindings("test-id", "proj-id");

      expect(result).not.toBeNull();
      expect(result?.findings).toHaveLength(1);
      expect(result?.findings[0].severity).toBe("CRITICAL");
    });
  });
});

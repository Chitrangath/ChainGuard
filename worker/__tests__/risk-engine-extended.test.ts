import { describe, it, expect } from "vitest";
import { calculateRisk, type RiskInput } from "../../src/lib/risk-engine";

function makeInput(overrides: Partial<RiskInput> = {}): RiskInput {
  return {
    severityCounts: { CRITICAL: 0, HIGH: 0, MEDIUM: 0, LOW: 0 },
    compilationStatus: "PASS",
    testStatus: "PASS",
    securityAnalysisStatus: "PASS",
    coverage: "FULL",
    ...overrides,
  };
}

describe("calculateRisk", () => {
  describe("basic scoring", () => {
    it("returns 100 with no findings and passing build/tests", () => {
      const result = calculateRisk(makeInput());
      expect(result.riskScore).toBe(100);
      expect(result.deploymentStatus).toBe("READY");
      expect(result.gateReasons).toEqual([]);
    });

    it("deducts 30 for each CRITICAL finding", () => {
      const result = calculateRisk(
        makeInput({ severityCounts: { CRITICAL: 1, HIGH: 0, MEDIUM: 0, LOW: 0 } }),
      );
      expect(result.riskScore).toBe(70);
      expect(result.deploymentStatus).toBe("BLOCKED");
      expect(result.criticalFindings).toBe(1);
    });

    it("deducts 15 for each HIGH finding", () => {
      const result = calculateRisk(
        makeInput({ severityCounts: { CRITICAL: 0, HIGH: 1, MEDIUM: 0, LOW: 0 } }),
      );
      expect(result.riskScore).toBe(85);
    });

    it("deducts 7 for each MEDIUM finding", () => {
      const result = calculateRisk(
        makeInput({ severityCounts: { CRITICAL: 0, HIGH: 0, MEDIUM: 1, LOW: 0 } }),
      );
      expect(result.riskScore).toBe(93);
    });

    it("deducts 2 for each LOW finding", () => {
      const result = calculateRisk(
        makeInput({ severityCounts: { CRITICAL: 0, HIGH: 0, MEDIUM: 0, LOW: 1 } }),
      );
      expect(result.riskScore).toBe(98);
    });

    it("deducts for multiple findings across severities", () => {
      const result = calculateRisk(
        makeInput({
          severityCounts: { CRITICAL: 1, HIGH: 2, MEDIUM: 1, LOW: 3 },
        }),
      );
      // 100 - 30 - 30 - 7 - 6 = 27
      expect(result.riskScore).toBe(27);
      expect(result.deploymentStatus).toBe("BLOCKED");
    });

    it("returns null riskScore for compilation failure", () => {
      const result = calculateRisk(makeInput({ compilationStatus: "FAIL" }));
      expect(result.riskScore).toBeNull();
      expect(result.deploymentStatus).toBe("BLOCKED");
    });

    it("deducts 10 for test failure", () => {
      const result = calculateRisk(makeInput({ testStatus: "FAIL" }));
      expect(result.riskScore).toBe(90);
      expect(result.deploymentStatus).toBe("BLOCKED");
    });

    it("clamps score to minimum 0", () => {
      const result = calculateRisk(
        makeInput({
          severityCounts: { CRITICAL: 5, HIGH: 5, MEDIUM: 5, LOW: 5 },
          testStatus: "FAIL",
        }),
      );
      expect(result.riskScore).toBe(0);
    });
  });

  describe("deployment gate reasons", () => {
    it("returns BLOCKED with CRITICAL_FINDINGS reason", () => {
      const result = calculateRisk(
        makeInput({ severityCounts: { CRITICAL: 1, HIGH: 0, MEDIUM: 0, LOW: 0 } }),
      );
      expect(result.gateReasons).toContain("CRITICAL_FINDINGS");
    });

    it("returns BLOCKED with COMPILATION_FAILED reason", () => {
      const result = calculateRisk(makeInput({ compilationStatus: "FAIL" }));
      expect(result.gateReasons).toContain("COMPILATION_FAILED");
    });

    it("returns BLOCKED with NO_TESTS reason when testStatus is NO_TESTS", () => {
      const result = calculateRisk(makeInput({ testStatus: "NO_TESTS" }));
      expect(result.gateReasons).toContain("NO_TESTS");
      expect(result.deploymentStatus).toBe("BLOCKED");
    });

    it("returns BLOCKED with TESTS_NOT_RUN reason", () => {
      const result = calculateRisk(makeInput({ testStatus: "NOT_RUN" }));
      expect(result.gateReasons).toContain("TESTS_NOT_RUN");
      expect(result.deploymentStatus).toBe("BLOCKED");
    });

    it("returns BLOCKED with TESTS_FAILED reason", () => {
      const result = calculateRisk(makeInput({ testStatus: "FAIL" }));
      expect(result.gateReasons).toContain("TESTS_FAILED");
    });

    it("returns BLOCKED with STATIC_ANALYSIS_FAILED reason", () => {
      const result = calculateRisk(
        makeInput({ securityAnalysisStatus: "FAIL" }),
      );
      expect(result.gateReasons).toContain("STATIC_ANALYSIS_FAILED");
      expect(result.deploymentStatus).toBe("BLOCKED");
    });

    it("returns BLOCKED with multiple reasons", () => {
      const result = calculateRisk(
        makeInput({
          severityCounts: { CRITICAL: 1, HIGH: 0, MEDIUM: 0, LOW: 0 },
          compilationStatus: "FAIL",
          testStatus: "NO_TESTS",
          securityAnalysisStatus: "FAIL",
        }),
      );
      expect(result.gateReasons).toEqual([
        "COMPILATION_FAILED",
        "NO_TESTS",
        "STATIC_ANALYSIS_FAILED",
      ]);
      expect(result.deploymentStatus).toBe("BLOCKED");
    });

    it("returns BLOCKED with SCORE_BELOW_THRESHOLD when score < 80", () => {
      const result = calculateRisk(
        makeInput({
          severityCounts: { CRITICAL: 1, HIGH: 0, MEDIUM: 0, LOW: 0 },
          testStatus: "PASS",
        }),
      );
      // 100 - 30 = 70
      expect(result.gateReasons).toContain("SCORE_BELOW_THRESHOLD");
    });
  });

  describe("NO_TESTS does not deduct points but blocks READY", () => {
    it("score remains 100 with NO_TESTS", () => {
      const result = calculateRisk(makeInput({ testStatus: "NO_TESTS" }));
      expect(result.riskScore).toBe(100);
      expect(result.deploymentStatus).toBe("BLOCKED");
      expect(result.gateReasons).toContain("NO_TESTS");
    });

    it("NO_TESTS plus findings deducts only for findings", () => {
      const result = calculateRisk(
        makeInput({
          severityCounts: { CRITICAL: 0, HIGH: 0, MEDIUM: 0, LOW: 1 },
          testStatus: "NO_TESTS",
        }),
      );
      // 100 - 2 = 98
      expect(result.riskScore).toBe(98);
      expect(result.deploymentStatus).toBe("BLOCKED");
    });
  });

  describe("securityAnalysisStatus effects", () => {
    it("FAIL securityAnalysisStatus blocks READY", () => {
      const result = calculateRisk(
        makeInput({ securityAnalysisStatus: "FAIL" }),
      );
      expect(result.deploymentStatus).toBe("BLOCKED");
    });

    it("NOT_RUN securityAnalysisStatus blocks READY", () => {
      const result = calculateRisk(
        makeInput({ securityAnalysisStatus: "NOT_RUN" }),
      );
      expect(result.deploymentStatus).toBe("BLOCKED");
      expect(result.gateReasons).toContain("STATIC_ANALYSIS_NOT_RUN");
    });

    it("PASS securityAnalysisStatus with no other issues is READY", () => {
      const result = calculateRisk(makeInput());
      expect(result.deploymentStatus).toBe("READY");
    });
  });

  describe("risk score unavailable", () => {
    it("does not add a score-threshold reason when evidence is incomplete", () => {
      const result = calculateRisk(
        makeInput({ securityAnalysisStatus: "FAIL", coverage: "PARTIAL" }),
      );
      expect(result.riskScore).toBeNull();
      expect(result.gateReasons).toEqual(["STATIC_ANALYSIS_FAILED", "INCOMPLETE_ANALYSIS"]);
    });

    it.each(["PARTIAL", "FAILED"] as const)(
      "returns null riskScore when coverage is %s",
      (coverage) => {
        const result = calculateRisk(makeInput({ coverage }));
        expect(result.riskScore).toBeNull();
        expect(result.deploymentStatus).toBe("BLOCKED");
        expect(result.gateReasons).toContain("INCOMPLETE_ANALYSIS");
      },
    );

    it.each([undefined, "UNSUPPORTED", "NO_CONTRACTS_FOUND"] as const)(
      "returns null riskScore when security evidence is %s",
      (securityAnalysisStatus) => {
        const result = calculateRisk(makeInput({ securityAnalysisStatus }));
        expect(result.riskScore).toBeNull();
        expect(result.deploymentStatus).toBe("BLOCKED");
      },
    );

    it("returns null riskScore when securityAnalysisStatus is FAIL", () => {
      const result = calculateRisk(
        makeInput({ securityAnalysisStatus: "FAIL" }),
      );
      expect(result.riskScore).toBeNull();
    });

    it("returns null riskScore when securityAnalysisStatus is NOT_RUN", () => {
      const result = calculateRisk(
        makeInput({ securityAnalysisStatus: "NOT_RUN" }),
      );
      expect(result.riskScore).toBeNull();
    });

    it("returns null riskScore when compilation FAIL prevents scanning", () => {
      const result = calculateRisk(makeInput({ compilationStatus: "FAIL" }));
      expect(result.riskScore).toBeNull();
    });

    it("returns available score when compilation PASS, tests PASS, scan PASS", () => {
      const result = calculateRisk(makeInput());
      expect(result.riskScore).toBe(100);
    });

    it("returns available score for standalone contract with NO_TESTS but successful scan", () => {
      const result = calculateRisk(
        makeInput({
          testStatus: "NO_TESTS",
          securityAnalysisStatus: "PASS",
          compilationStatus: "PASS",
        }),
      );
      expect(result.riskScore).toBe(100);
      expect(result.deploymentStatus).toBe("BLOCKED");
    });
  });

  describe("READY requires all conditions", () => {
    it("requires score >= 80", () => {
      const result = calculateRisk(
        makeInput({
          severityCounts: { CRITICAL: 1, HIGH: 0, MEDIUM: 0, LOW: 0 },
        }),
      );
      expect(result.deploymentStatus).toBe("BLOCKED");
    });

    it("requires no critical findings", () => {
      const result = calculateRisk(
        makeInput({
          severityCounts: { CRITICAL: 1, HIGH: 0, MEDIUM: 0, LOW: 0 },
        }),
      );
      expect(result.deploymentStatus).toBe("BLOCKED");
    });

    it("requires compilation PASS", () => {
      const result = calculateRisk(makeInput({ compilationStatus: "FAIL" }));
      expect(result.deploymentStatus).toBe("BLOCKED");
    });

    it("requires tests PASS (not NO_TESTS)", () => {
      const result = calculateRisk(makeInput({ testStatus: "NO_TESTS" }));
      expect(result.deploymentStatus).toBe("BLOCKED");
    });

    it("requires securityAnalysisStatus PASS", () => {
      const result = calculateRisk(
        makeInput({ securityAnalysisStatus: "FAIL" }),
      );
      expect(result.deploymentStatus).toBe("BLOCKED");
    });
  });
});

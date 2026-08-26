import { describe, it, expect } from "vitest";
import { calculateRisk, type RiskInput } from "../../src/lib/risk-engine";

function makeInput(overrides: Partial<RiskInput> = {}): RiskInput {
  return {
    severityCounts: { CRITICAL: 0, HIGH: 0, MEDIUM: 0, LOW: 0 },
    compilationStatus: "PASS",
    testStatus: "PASS",
    ...overrides,
  };
}

describe("calculateRisk", () => {
  it("returns 100 with no findings and passing build/tests", () => {
    const result = calculateRisk(makeInput());
    expect(result.riskScore).toBe(100);
    expect(result.deploymentStatus).toBe("READY");
  });

  it("deducts 30 for each CRITICAL finding", () => {
    const result = calculateRisk(makeInput({ severityCounts: { CRITICAL: 1, HIGH: 0, MEDIUM: 0, LOW: 0 } }));
    expect(result.riskScore).toBe(70);
    expect(result.deploymentStatus).toBe("BLOCKED");
    expect(result.criticalFindings).toBe(1);
  });

  it("deducts 15 for each HIGH finding", () => {
    const result = calculateRisk(makeInput({ severityCounts: { CRITICAL: 0, HIGH: 1, MEDIUM: 0, LOW: 0 } }));
    expect(result.riskScore).toBe(85);
  });

  it("deducts 7 for each MEDIUM finding", () => {
    const result = calculateRisk(makeInput({ severityCounts: { CRITICAL: 0, HIGH: 0, MEDIUM: 1, LOW: 0 } }));
    expect(result.riskScore).toBe(93);
  });

  it("deducts 2 for each LOW finding", () => {
    const result = calculateRisk(makeInput({ severityCounts: { CRITICAL: 0, HIGH: 0, MEDIUM: 0, LOW: 1 } }));
    expect(result.riskScore).toBe(98);
  });

  it("deducts for multiple findings across severities", () => {
    const result = calculateRisk(makeInput({
      severityCounts: { CRITICAL: 1, HIGH: 2, MEDIUM: 1, LOW: 3 },
    }));
    // 100 - 30 - 30 - 7 - 6 = 27
    expect(result.riskScore).toBe(27);
    expect(result.deploymentStatus).toBe("BLOCKED");
  });

  it("deducts 20 for compilation failure", () => {
    const result = calculateRisk(makeInput({ compilationStatus: "FAIL" }));
    expect(result.riskScore).toBe(80);
    expect(result.deploymentStatus).toBe("BLOCKED");
  });

  it("deducts 10 for test failure", () => {
    const result = calculateRisk(makeInput({ testStatus: "FAIL" }));
    expect(result.riskScore).toBe(90);
    expect(result.deploymentStatus).toBe("BLOCKED");
  });

  it("clamps score to minimum 0", () => {
    const result = calculateRisk(makeInput({
      severityCounts: { CRITICAL: 5, HIGH: 5, MEDIUM: 5, LOW: 5 },
      compilationStatus: "FAIL",
      testStatus: "FAIL",
    }));
    expect(result.riskScore).toBe(0);
  });

  it("clamps score to maximum 100", () => {
    const result = calculateRisk(makeInput());
    expect(result.riskScore).toBe(100);
  });

  it("returns BLOCKED when critical findings exist even if score >= 80", () => {
    const result = calculateRisk(makeInput({
      severityCounts: { CRITICAL: 1, HIGH: 0, MEDIUM: 0, LOW: 0 },
    }));
    // 100 - 30 = 70, but BLOCKED because of critical
    expect(result.riskScore).toBe(70);
    expect(result.deploymentStatus).toBe("BLOCKED");
    expect(result.criticalFindings).toBe(1);
  });

  it("returns BLOCKED when compilation fails even if score >= 80", () => {
    const result = calculateRisk(makeInput({ compilationStatus: "FAIL" }));
    expect(result.riskScore).toBe(80);
    expect(result.deploymentStatus).toBe("BLOCKED");
  });

  it("returns BLOCKED when tests fail even if score >= 80", () => {
    const result = calculateRisk(makeInput({ testStatus: "FAIL" }));
    expect(result.riskScore).toBe(90);
    expect(result.deploymentStatus).toBe("BLOCKED");
  });

  it("returns READY when score >= 80 with no criticals and passing build/tests", () => {
    const result = calculateRisk(makeInput({
      severityCounts: { CRITICAL: 0, HIGH: 1, MEDIUM: 0, LOW: 0 },
    }));
    // 100 - 15 = 85, no criticals, compilation PASS, tests PASS
    expect(result.riskScore).toBe(85);
    expect(result.deploymentStatus).toBe("READY");
  });

  it("returns BLOCKED when score >= 80 but has critical finding", () => {
    const result = calculateRisk(makeInput({
      severityCounts: { CRITICAL: 1, HIGH: 0, MEDIUM: 0, LOW: 0 },
    }));
    expect(result.deploymentStatus).toBe("BLOCKED");
  });
});

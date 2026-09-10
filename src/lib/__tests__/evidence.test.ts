import { describe, expect, it } from "vitest";
import { presentAnalysisSignals } from "../evidence";

describe("legacy evidence presentation", () => {
  it("quarantines historic pass, tests, findings, and score signals", () => {
    expect(presentAnalysisSignals(null, {
      compilationStatus: "PASS",
      testStatus: "PASS",
      totalTests: 3,
      passedTests: 3,
      failedTests: 0,
      findingCount: 2,
    })).toEqual({
      compilationStatus: null,
      testStatus: null,
      totalTests: null,
      passedTests: null,
      failedTests: null,
      findingCount: null,
    });
  });

  it("preserves current verified evidence", () => {
    const signals = { compilationStatus: "PASS", testStatus: "NO_TESTS", totalTests: null, passedTests: null, failedTests: null, findingCount: 0 };
    expect(presentAnalysisSignals(2, signals)).toEqual(signals);
  });
});

import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { AnalysisSummary } from "../AnalysisSummary";
import type { AnalysisData } from "@/lib/analysis-utils";

const base: AnalysisData = {
  id: "analysis", status: "COMPLETED", riskScore: 90, deploymentStatus: "BLOCKED",
  compilationStatus: "PASS", testStatus: "PASS", totalTests: 1, passedTests: 1, failedTests: 0,
  startedAt: null, completedAt: null, createdAt: "2026-09-10T00:00:00.000Z", findings: [],
  findingsPagination: { page: 1, pageSize: 25, total: 0, totalPages: 0, severity: null },
  projectType: "FOUNDRY", compilerVersion: "0.8.24", contractsDiscovered: 1, contractsCompiled: 1,
  contractsTargetedForScan: null, securityAnalysisStatus: "PASS", gateReasons: [], coverage: "FULL",
  evidenceStatus: "VERIFIED",
};

function render(overrides: Partial<AnalysisData>): string {
  return renderToStaticMarkup(createElement(AnalysisSummary, { analysis: { ...base, ...overrides } }));
}

describe("AnalysisSummary evidence states", () => {
  it("renders failed and partial states explicitly", () => {
    expect(render({ status: "FAILED", riskScore: null, securityAnalysisStatus: "FAIL", coverage: "FAILED" })).toContain("Analysis Failed");
    expect(render({ riskScore: null, coverage: "PARTIAL", gateReasons: ["INCOMPLETE_ANALYSIS"] })).toContain("Incomplete Analysis");
  });

  it("renders no-contract and no-test states without implying a successful scan", () => {
    const noContracts = render({ riskScore: null, compilationStatus: "NOT_RUN", testStatus: "NOT_RUN", totalTests: null, passedTests: null, failedTests: null, securityAnalysisStatus: "NO_CONTRACTS_FOUND", coverage: "FAILED", gateReasons: ["NO_CONTRACTS_FOUND"] });
    expect(noContracts).toContain("No contracts were found to analyze.");
    expect(noContracts).toContain("Findings unavailable");
    expect(noContracts).not.toContain("0 findings");
    expect(render({ testStatus: "NO_TESTS", totalTests: null, passedTests: null, failedTests: null, gateReasons: ["NO_TESTS"] }))
      .toContain("No Tests");
  });

  it("renders only the rerun qualification for legacy evidence", () => {
    const html = render({ evidenceStatus: "LEGACY_UNVERIFIED", riskScore: null, compilationStatus: null, testStatus: null });
    expect(html).toContain("Legacy analysis — rerun required");
    expect(html).not.toContain("Risk Score");
    expect(html).not.toContain("0 findings");
  });
});

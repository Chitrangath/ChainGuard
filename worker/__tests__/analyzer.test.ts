import { describe, it, expect, vi } from "vitest";
import { runAnalysis, parseTestOutput, type AnalysisContext } from "../analyzer";

vi.mock("../db", () => ({
  getDb: () => ({
    analysis: {
      update: vi.fn().mockResolvedValue({}),
    },
    finding: {
      createMany: vi.fn().mockResolvedValue({}),
    },
  }),
}));

describe("parseTestOutput", () => {
  it("parses '3 passed' format (forge default)", () => {
    const output =
      "Suite result: ok. 3 passed; 0 failed; 0 skipped\n" +
      "Ran 1 test suite: 3 tests passed, 0 failed, 0 skipped (3 total tests)";
    const result = parseTestOutput(output);
    expect(result.passedTests).toBe(3);
    expect(result.failedTests).toBe(0);
    expect(result.totalTests).toBe(3);
  });

  it("parses '3 tests passed' format", () => {
    const output = "Ran 2 test suites: 3 tests passed, 0 failed";
    const result = parseTestOutput(output);
    expect(result.passedTests).toBe(3);
    expect(result.failedTests).toBe(0);
    expect(result.totalTests).toBe(3);
  });

  it("parses '1 failed' format", () => {
    const output =
      "Suite result: fail. 2 passed; 1 failed\n" +
      "Ran 1 test suite: 2 tests passed, 1 failed";
    const result = parseTestOutput(output);
    expect(result.passedTests).toBe(2);
    expect(result.failedTests).toBe(1);
    expect(result.totalTests).toBe(3);
  });

  it("parses '1 test failed' format", () => {
    const output = "Suite result: fail. 0 passed; 1 test failed";
    const result = parseTestOutput(output);
    expect(result.passedTests).toBe(0);
    expect(result.failedTests).toBe(1);
    expect(result.totalTests).toBe(1);
  });

  it("returns nulls for empty output", () => {
    const result = parseTestOutput("");
    expect(result.passedTests).toBeNull();
    expect(result.failedTests).toBeNull();
    expect(result.totalTests).toBeNull();
  });

  it("parses only passed when no failures", () => {
    const output = "5 passed; 0 failed";
    const result = parseTestOutput(output);
    expect(result.passedTests).toBe(5);
    expect(result.failedTests).toBe(0);
    expect(result.totalTests).toBe(5);
  });

  it("handles mixed forge output", () => {
    const output =
      "No files changed, compilation skipped\n\n" +
      "Ran 3 tests for test/Vault.t.sol:VaultTest\n" +
      "[PASS] test_deposit() (gas: 41358)\n" +
      "[PASS] test_withdraw() (gas: 50957)\n" +
      "[PASS] test_revert_on_insufficient_balance() (gas: 14036)\n" +
      "Suite result: ok. 3 passed; 0 failed; 0 skipped; finished in 5.54ms\n\n" +
      "Ran 1 test suite in 143.45ms (5.54ms CPU time): 3 tests passed, 0 failed, 0 skipped (3 total tests)";
    const result = parseTestOutput(output);
    expect(result.passedTests).toBe(3);
    expect(result.failedTests).toBe(0);
    expect(result.totalTests).toBe(3);
  });
});

describe("runAnalysis", () => {
  const baseContext: AnalysisContext = {
    analysisId: "test-analysis-id",
    projectId: "test-project-id",
    repositoryUrl: "https://github.com/example/repo",
    projectDir: "/tmp/test",
  };

  it("rejects invalid repository URLs", async () => {
    const result = await runAnalysis({
      ...baseContext,
      repositoryUrl: "not-a-valid-url",
    });
    expect(result.success).toBe(false);
    expect(result.error).toContain("Invalid repository URL");
  });

  it("rejects non-GitHub URLs", async () => {
    const result = await runAnalysis({
      ...baseContext,
      repositoryUrl: "https://gitlab.com/some/repo",
    });
    expect(result.success).toBe(false);
    expect(result.error).toContain("Invalid repository URL");
  });

  it("returns AnalysisResult type", async () => {
    const result = await runAnalysis({
      ...baseContext,
      repositoryUrl: "https://github.com/example/repo",
    });
    expect(typeof result.success).toBe("boolean");
    expect(result).toHaveProperty("success");
  });
});

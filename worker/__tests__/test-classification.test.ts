import { describe, it, expect } from "vitest";
import {
  parseTestOutput,
  classifyTestResult,
  type ForgeTestCounts,
} from "../analyzer";

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

  it("detects zero-test output as zero executed tests", () => {
    const output = "No test results, no test files found";
    const result = parseTestOutput(output);
    expect(result.passedTests).toBeNull();
    expect(result.failedTests).toBeNull();
    expect(result.totalTests).toBeNull();
  });

  it("detects forge '0 tests ran' output", () => {
    const output =
      "Compiling 0 files with Solc 0.8.20\n" +
      "No test files found";
    const result = parseTestOutput(output);
    expect(result.passedTests).toBeNull();
    expect(result.failedTests).toBeNull();
    expect(result.totalTests).toBeNull();
  });
});

describe("classifyTestResult", () => {
  const counts: ForgeTestCounts = { passedTests: null, failedTests: null, totalTests: null };

  it("returns NOT_RUN when compilation failed", () => {
    const result = classifyTestResult(counts, "FAIL");
    expect(result.status).toBe("NOT_RUN");
  });

  it("returns NO_TESTS when zero tests executed and all counts null", () => {
    const result = classifyTestResult(counts, "PASS");
    expect(result.status).toBe("NO_TESTS");
  });

  it("returns PASS when tests executed and all passed", () => {
    const result = classifyTestResult(
      { passedTests: 3, failedTests: 0, totalTests: 3 },
      "PASS",
    );
    expect(result.status).toBe("PASS");
    if (result.status === "PASS") {
      expect(result.totalTests).toBe(3);
      expect(result.passedTests).toBe(3);
      expect(result.failedTests).toBe(0);
    }
  });

  it("returns FAIL when tests executed and some failed", () => {
    const result = classifyTestResult(
      { passedTests: 2, failedTests: 1, totalTests: 3 },
      "PASS",
    );
    expect(result.status).toBe("FAIL");
  });

  it("returns NO_TESTS when only failures are reported (total is zero)", () => {
    const result = classifyTestResult(
      { passedTests: 0, failedTests: 0, totalTests: 0 },
      "PASS",
    );
    expect(result.status).toBe("NO_TESTS");
  });

  it("does NOT return PASS when no tests actually executed", () => {
    const result = classifyTestResult(
      { passedTests: null, failedTests: null, totalTests: null },
      "PASS",
    );
    expect(result.status).not.toBe("PASS");
    expect(result.status).toBe("NO_TESTS");
  });
});

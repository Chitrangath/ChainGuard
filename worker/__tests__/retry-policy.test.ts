import { describe, expect, it } from "vitest";
import {
  classifyAnalyzerProcessFailure,
  classifyCloneFailure,
  decideRetry,
  retryDelayMs,
} from "../retry-policy";

describe("worker retry policy", () => {
  it("requeues a transient analyzer timeout while attempts remain", () => {
    expect(decideRetry("ANALYSIS_TIMEOUT", 1)).toEqual({ retry: true, terminalReason: null });
    expect(retryDelayMs(1)).toBe(1_000);
  });

  it.each([
    "OUTPUT_LIMIT", "INVALID_REPOSITORY_URL", "UNSUPPORTED_COMPILER",
    "SUBMODULE_CONFIGURATION_INVALID", "FORGE_BUILD_FAILED", "SECURITY_POLICY_REJECTED", "WORKSPACE_LIMIT",
  ])("does not retry deterministic or policy failure %s", (reason) => {
    expect(decideRetry(reason, 1)).toEqual({ retry: false, terminalReason: reason });
  });

  it("terminates a transient failure after the third attempt", () => {
    expect(decideRetry("SPAWN_FAILED", 3)).toEqual({ retry: false, terminalReason: "RETRIES_EXHAUSTED" });
  });

  it("classifies bounded clone network failures as retryable without exposing stderr", () => {
    expect(classifyCloneFailure({
      exitCode: 128,
      stdout: "",
      stderr: "fatal: unable to access 'https://github.com/a/b': Could not resolve host: github.com",
    })).toBe("CLONE_TRANSIENT_FAILURE");
    expect(classifyCloneFailure({ exitCode: 128, stdout: "", stderr: "fatal: repository not found" })).toBe("CLONE_FAILED");
  });

  it("classifies an unavailable analyzer runtime as retryable", () => {
    expect(classifyAnalyzerProcessFailure({
      exitCode: 125,
      stdout: "",
      stderr: "Cannot connect to the Docker daemon",
    }, "FORGE_BUILD_FAILED")).toBe("ANALYZER_UNAVAILABLE");
    expect(classifyAnalyzerProcessFailure({ exitCode: 1, stdout: "", stderr: "Parser error" }, "FORGE_BUILD_FAILED"))
      .toBe("FORGE_BUILD_FAILED");
  });
});

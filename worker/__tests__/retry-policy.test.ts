import { describe, expect, it } from "vitest";
import { decideRetry, retryDelayMs } from "../retry-policy";

describe("worker retry policy", () => {
  it("requeues a transient analyzer timeout while attempts remain", () => {
    expect(decideRetry("ANALYSIS_TIMEOUT", 1)).toEqual({ retry: true, terminalReason: null });
    expect(retryDelayMs(1)).toBe(1_000);
  });

  it.each([
    "OUTPUT_LIMIT", "INVALID_REPOSITORY_URL", "UNSUPPORTED_COMPILER",
    "SUBMODULE_CONFIGURATION_INVALID", "FORGE_BUILD_FAILED", "SECURITY_POLICY_REJECTED",
  ])("does not retry deterministic or policy failure %s", (reason) => {
    expect(decideRetry(reason, 1)).toEqual({ retry: false, terminalReason: reason });
  });

  it("terminates a transient failure after the third attempt", () => {
    expect(decideRetry("SPAWN_FAILED", 3)).toEqual({ retry: false, terminalReason: "RETRIES_EXHAUSTED" });
  });
});

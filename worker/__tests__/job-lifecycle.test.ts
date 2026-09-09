import { describe, expect, it } from "vitest";
import { failureTransition, staleTransition } from "../job-lifecycle";

describe("analysis job lifecycle", () => {
  it("requeues retryable work with safe evidence and deterministic schedule", () => {
    const now = new Date("2026-09-09T21:00:00.000Z");
    expect(failureTransition("ANALYSIS_TIMEOUT", 1, now)).toMatchObject({
      status: "QUEUED", attemptCount: 1, lastSafeReason: "ANALYSIS_TIMEOUT",
      terminalReason: null, startedAt: null, completedAt: null,
      nextAttemptAt: new Date("2026-09-09T21:00:01.000Z"),
    });
  });

  it("persists a terminal non-retryable failure", () => {
    expect(failureTransition("OUTPUT_LIMIT", 1, new Date(0))).toMatchObject({
      status: "FAILED", riskScore: null, deploymentStatus: "BLOCKED",
      lastSafeReason: "OUTPUT_LIMIT", terminalReason: "OUTPUT_LIMIT",
    });
  });

  it("recovers stale work as a bounded timeout retry and exhausts safely", () => {
    expect(staleTransition(1, new Date(0)).status).toBe("QUEUED");
    expect(staleTransition(3, new Date(0))).toMatchObject({ status: "FAILED", terminalReason: "RETRIES_EXHAUSTED" });
  });
});

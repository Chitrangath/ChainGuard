import { decideRetry, retryDelayMs } from "./retry-policy";

const blockedFailure = {
  riskScore: null,
  deploymentStatus: "BLOCKED" as const,
  coverage: "FAILED" as const,
  gateReasons: ["INCOMPLETE_ANALYSIS"],
};

export function failureTransition(reason: string, attemptCount: number, now: Date) {
  const decision = decideRetry(reason, attemptCount);
  if (decision.retry) {
    return {
      status: "QUEUED" as const,
      attemptCount,
      startedAt: null,
      completedAt: null,
      nextAttemptAt: new Date(now.getTime() + retryDelayMs(attemptCount)),
      lastSafeReason: reason,
      terminalReason: null,
      failureReason: reason,
      ...blockedFailure,
    };
  }
  return {
    status: "FAILED" as const,
    attemptCount,
    completedAt: now,
    nextAttemptAt: null,
    lastSafeReason: reason,
    terminalReason: decision.terminalReason,
    failureReason: decision.terminalReason,
    ...blockedFailure,
  };
}

export function staleTransition(attemptCount: number, now: Date) {
  return failureTransition("ANALYSIS_TIMEOUT", attemptCount, now);
}

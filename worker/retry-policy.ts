export const MAX_ANALYSIS_ATTEMPTS = 3;

const RETRYABLE_REASONS = new Set([
  "ANALYSIS_TIMEOUT",
  "TIMEOUT",
  "ABORTED",
  "SPAWN_FAILED",
  "ANALYZER_UNAVAILABLE",
  "CLONE_TRANSIENT_FAILURE",
]);

export function retryDelayMs(attemptCount: number): number {
  return Math.min(4_000, 1_000 * 2 ** Math.max(0, attemptCount - 1));
}

export function decideRetry(reason: string, attemptCount: number): {
  retry: boolean;
  terminalReason: string | null;
} {
  if (!RETRYABLE_REASONS.has(reason)) return { retry: false, terminalReason: reason };
  if (attemptCount >= MAX_ANALYSIS_ATTEMPTS) return { retry: false, terminalReason: "RETRIES_EXHAUSTED" };
  return { retry: true, terminalReason: null };
}

export function isRetryableReason(reason: string): boolean {
  return RETRYABLE_REASONS.has(reason);
}

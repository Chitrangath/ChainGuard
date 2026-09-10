import type { ProcessResult } from "./process-runner";

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

const TRANSIENT_CLONE_PATTERNS = [
  /could not resolve host/i,
  /failed to connect/i,
  /connection (?:timed out|reset)/i,
  /remote end hung up/i,
  /tls handshake timeout/i,
  /the requested url returned error: 5\d\d/i,
];

const ANALYZER_UNAVAILABLE_PATTERNS = [
  /cannot connect to the docker daemon/i,
  /is the docker daemon running/i,
  /no such image/i,
  /error during connect/i,
];

export function classifyCloneFailure(result: ProcessResult): string {
  if (result.reasonCode) return result.reasonCode;
  return TRANSIENT_CLONE_PATTERNS.some((pattern) => pattern.test(result.stderr))
    ? "CLONE_TRANSIENT_FAILURE"
    : "CLONE_FAILED";
}

export function classifyAnalyzerProcessFailure(result: ProcessResult, fallback: string): string {
  if (result.reasonCode) return result.reasonCode;
  return ANALYZER_UNAVAILABLE_PATTERNS.some((pattern) => pattern.test(result.stderr))
    ? "ANALYZER_UNAVAILABLE"
    : fallback;
}

import { randomUUID } from "node:crypto";
import * as path from "node:path";

export const WORKSPACE_BASE = "/tmp/guardrails";

export interface ExecutionLease {
  id: string;
  executionToken: string;
}

export function newExecutionToken(): string {
  return randomUUID();
}

function requireSafePart(value: string): string {
  if (!value || !/^[a-zA-Z0-9_-]+$/.test(value)) {
    throw new Error("INVALID_EXECUTION_IDENTITY");
  }
  return value;
}

export function executionResourceId(lease: ExecutionLease): string {
  return `${requireSafePart(lease.id)}-${requireSafePart(lease.executionToken)}`;
}

export function executionWorkspace(lease: ExecutionLease): string {
  return path.join(WORKSPACE_BASE, executionResourceId(lease));
}

export function executionContainerName(lease: ExecutionLease): string {
  return `chainguard-${executionResourceId(lease)}-analysis`;
}

export function ownedRunningWhere(lease: ExecutionLease) {
  return {
    id: lease.id,
    status: "RUNNING" as const,
    executionToken: lease.executionToken,
  };
}

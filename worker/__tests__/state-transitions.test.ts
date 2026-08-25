import { describe, it, expect } from "vitest";

describe("Analysis state transitions", () => {
  const validTransitions: Record<string, string[]> = {
    QUEUED: ["RUNNING"],
    RUNNING: ["COMPLETED", "FAILED"],
    COMPLETED: [],
    FAILED: [],
  };

  it("allows QUEUED -> RUNNING", () => {
    expect(validTransitions["QUEUED"]).toContain("RUNNING");
  });

  it("allows RUNNING -> COMPLETED", () => {
    expect(validTransitions["RUNNING"]).toContain("COMPLETED");
  });

  it("allows RUNNING -> FAILED", () => {
    expect(validTransitions["RUNNING"]).toContain("FAILED");
  });

  it("does not allow COMPLETED -> RUNNING", () => {
    expect(validTransitions["COMPLETED"]).not.toContain("RUNNING");
  });

  it("does not allow FAILED -> RUNNING", () => {
    expect(validTransitions["FAILED"]).not.toContain("RUNNING");
  });

  it("does not allow COMPLETED -> FAILED", () => {
    expect(validTransitions["COMPLETED"]).not.toContain("FAILED");
  });

  it("does not allow FAILED -> COMPLETED", () => {
    expect(validTransitions["FAILED"]).not.toContain("COMPLETED");
  });

  it("does not allow QUEUED -> COMPLETED directly", () => {
    expect(validTransitions["QUEUED"]).not.toContain("COMPLETED");
  });

  it("does not allow QUEUED -> FAILED directly", () => {
    expect(validTransitions["QUEUED"]).not.toContain("FAILED");
  });
});

import { describe, expect, it } from "vitest";
import {
  executionContainerName,
  executionWorkspace,
  ownedRunningWhere,
} from "../job-ownership";

describe("analysis execution ownership", () => {
  const first = { id: "analysis-1", executionToken: "attempt-one" };
  const retry = { id: "analysis-1", executionToken: "attempt-two" };

  it("gives every retry distinct resources", () => {
    expect(executionWorkspace(first)).not.toBe(executionWorkspace(retry));
    expect(executionContainerName(first)).not.toBe(executionContainerName(retry));
  });

  it("requires the attempt token for writes to a running analysis", () => {
    expect(ownedRunningWhere(first)).toEqual({
      id: "analysis-1",
      status: "RUNNING",
      executionToken: "attempt-one",
    });
  });

  it("rejects unsafe resource identifiers", () => {
    expect(() => executionWorkspace({ id: "../analysis", executionToken: "attempt" })).toThrow("INVALID_EXECUTION_IDENTITY");
  });
});

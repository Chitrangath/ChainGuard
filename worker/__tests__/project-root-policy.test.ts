import { describe, expect, it } from "vitest";
import { selectSingleProjectRoot } from "../project-root-policy";

describe("single project-root policy", () => {
  it("selects one deterministic root and marks additional roots incomplete", () => {
    expect(selectSingleProjectRoot(["/repo/zeta", "/repo/alpha"])).toEqual({
      selectedRoot: "/repo/alpha",
      rootsDiscovered: 2,
      rootsAnalyzed: 1,
      incomplete: true,
      reason: "additional_roots_not_analyzed",
    });
  });

  it("keeps one root complete", () => {
    expect(selectSingleProjectRoot(["/repo/contracts"]).incomplete).toBe(false);
  });
});

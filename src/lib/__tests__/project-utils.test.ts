import { describe, it, expect } from "vitest";
import {
  extractRepoDisplay,
  lifecycleLabel,
  deploymentLabel,
  lifecycleBadgeClass,
  deploymentBadgeClass,
  riskColor,
} from "../project-utils";

describe("extractRepoDisplay", () => {
  it("extracts owner/repo from a valid GitHub URL", () => {
    expect(extractRepoDisplay("https://github.com/org/repo")).toBe("org/repo");
  });

  it("handles URLs with extra path segments", () => {
    expect(extractRepoDisplay("https://github.com/org/repo/tree/main")).toBe("org/repo");
  });

  it("returns the original URL for invalid URLs", () => {
    expect(extractRepoDisplay("not-a-url")).toBe("not-a-url");
  });

  it("handles URLs with trailing slashes", () => {
    expect(extractRepoDisplay("https://github.com/org/repo/")).toBe("org/repo");
  });
});

describe("lifecycleLabel", () => {
  it("returns 'Queued' for QUEUED", () => {
    expect(lifecycleLabel("QUEUED")).toBe("Queued");
  });

  it("returns 'Running' for RUNNING", () => {
    expect(lifecycleLabel("RUNNING")).toBe("Running");
  });

  it("returns 'Completed' for COMPLETED", () => {
    expect(lifecycleLabel("COMPLETED")).toBe("Completed");
  });

  it("returns 'Failed' for FAILED", () => {
    expect(lifecycleLabel("FAILED")).toBe("Failed");
  });

  it("returns 'Not analyzed' for undefined", () => {
    expect(lifecycleLabel(undefined)).toBe("Not analyzed");
  });

  it("returns the raw status for unknown values", () => {
    expect(lifecycleLabel("UNKNOWN")).toBe("UNKNOWN");
  });
});

describe("deploymentLabel", () => {
  it("returns 'Ready' for READY", () => {
    expect(deploymentLabel("READY")).toBe("Ready");
  });

  it("returns 'Blocked' for BLOCKED", () => {
    expect(deploymentLabel("BLOCKED")).toBe("Blocked");
  });

  it("returns '—' for null", () => {
    expect(deploymentLabel(null)).toBe("—");
  });

  it("returns '—' for undefined", () => {
    expect(deploymentLabel(undefined)).toBe("—");
  });

  it("returns the raw status for unknown values", () => {
    expect(deploymentLabel("UNKNOWN")).toBe("UNKNOWN");
  });
});

describe("lifecycleBadgeClass", () => {
  it("returns badge-queued for QUEUED", () => {
    expect(lifecycleBadgeClass("QUEUED")).toBe("badge badge-queued");
  });

  it("returns badge-running for RUNNING", () => {
    expect(lifecycleBadgeClass("RUNNING")).toBe("badge badge-running");
  });

  it("returns badge-ready for COMPLETED", () => {
    expect(lifecycleBadgeClass("COMPLETED")).toBe("badge badge-ready");
  });

  it("returns badge-blocked for FAILED", () => {
    expect(lifecycleBadgeClass("FAILED")).toBe("badge badge-blocked");
  });

  it("returns badge-unavailable for undefined", () => {
    expect(lifecycleBadgeClass(undefined)).toBe("badge badge-unavailable");
  });
});

describe("deploymentBadgeClass", () => {
  it("returns badge-ready for READY", () => {
    expect(deploymentBadgeClass("READY")).toBe("badge badge-ready");
  });

  it("returns badge-blocked for BLOCKED", () => {
    expect(deploymentBadgeClass("BLOCKED")).toBe("badge badge-blocked");
  });

  it("returns empty string for null", () => {
    expect(deploymentBadgeClass(null)).toBe("");
  });

  it("returns empty string for undefined", () => {
    expect(deploymentBadgeClass(undefined)).toBe("");
  });
});

describe("riskColor", () => {
  it("returns ready color for score >= 80", () => {
    expect(riskColor(80)).toBe("var(--color-ready)");
    expect(riskColor(100)).toBe("var(--color-ready)");
  });

  it("returns medium color for score 60-79", () => {
    expect(riskColor(60)).toBe("var(--color-medium)");
    expect(riskColor(79)).toBe("var(--color-medium)");
  });

  it("returns high color for score 40-59", () => {
    expect(riskColor(40)).toBe("var(--color-high)");
    expect(riskColor(59)).toBe("var(--color-high)");
  });

  it("returns critical color for score < 40", () => {
    expect(riskColor(0)).toBe("var(--color-critical)");
    expect(riskColor(39)).toBe("var(--color-critical)");
  });
});

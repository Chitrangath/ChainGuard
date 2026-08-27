import { describe, it, expect } from "vitest";
import { createProjectSchema, analysisHistoryFilterSchema, findingFilterSchema } from "../validation";

describe("createProjectSchema", () => {
  const validInput = {
    name: "DeFi Vault",
    repositoryUrl: "https://github.com/example/defi-vault",
    description: "Example Solidity project",
  };

  it("accepts valid input", () => {
    const result = createProjectSchema.safeParse(validInput);
    expect(result.success).toBe(true);
  });

  it("accepts input without description", () => {
    const result = createProjectSchema.safeParse({
      name: "DeFi Vault",
      repositoryUrl: "https://github.com/example/defi-vault",
    });
    expect(result.success).toBe(true);
  });

  it("rejects missing name", () => {
    const result = createProjectSchema.safeParse({
      repositoryUrl: "https://github.com/example/defi-vault",
    });
    expect(result.success).toBe(false);
  });

  it("rejects empty name", () => {
    const result = createProjectSchema.safeParse({
      name: "",
      repositoryUrl: "https://github.com/example/defi-vault",
    });
    expect(result.success).toBe(false);
  });

  it("rejects name exceeding 100 characters", () => {
    const result = createProjectSchema.safeParse({
      name: "A".repeat(101),
      repositoryUrl: "https://github.com/example/defi-vault",
    });
    expect(result.success).toBe(false);
  });

  it("rejects missing repositoryUrl", () => {
    const result = createProjectSchema.safeParse({
      name: "DeFi Vault",
    });
    expect(result.success).toBe(false);
  });

  it("rejects non-URL repositoryUrl", () => {
    const result = createProjectSchema.safeParse({
      name: "DeFi Vault",
      repositoryUrl: "not-a-url",
    });
    expect(result.success).toBe(false);
  });

  it("rejects non-GitHub URLs", () => {
    const result = createProjectSchema.safeParse({
      name: "DeFi Vault",
      repositoryUrl: "https://gitlab.com/owner/repo",
    });
    expect(result.success).toBe(false);
  });

  it("rejects HTTP GitHub URLs", () => {
    const result = createProjectSchema.safeParse({
      name: "DeFi Vault",
      repositoryUrl: "http://github.com/owner/repo",
    });
    expect(result.success).toBe(false);
  });

  it("rejects GitHub URLs with invalid path", () => {
    const result = createProjectSchema.safeParse({
      name: "DeFi Vault",
      repositoryUrl: "https://github.com/owner",
    });
    expect(result.success).toBe(false);
  });

  it("accepts GitHub URLs with subpath", () => {
    const result = createProjectSchema.safeParse({
      name: "DeFi Vault",
      repositoryUrl: "https://github.com/owner/repo/tree/main",
    });
    expect(result.success).toBe(true);
  });

  it("rejects description exceeding 500 characters", () => {
    const result = createProjectSchema.safeParse({
      ...validInput,
      description: "A".repeat(501),
    });
    expect(result.success).toBe(false);
  });

  it("accepts description at exactly 500 characters", () => {
    const result = createProjectSchema.safeParse({
      ...validInput,
      description: "A".repeat(500),
    });
    expect(result.success).toBe(true);
  });
});

describe("pagination via analysisHistoryFilterSchema", () => {
  it("defaults to page 1, pageSize 10", () => {
    const result = analysisHistoryFilterSchema.safeParse({});
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.page).toBe(1);
      expect(result.data.pageSize).toBe(10);
    }
  });

  it("accepts valid page and pageSize", () => {
    const result = analysisHistoryFilterSchema.safeParse({ page: "2", pageSize: "5" });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.page).toBe(2);
      expect(result.data.pageSize).toBe(5);
    }
  });

  it("rejects page 0", () => {
    const result = analysisHistoryFilterSchema.safeParse({ page: "0" });
    expect(result.success).toBe(false);
  });

  it("rejects negative page", () => {
    const result = analysisHistoryFilterSchema.safeParse({ page: "-1" });
    expect(result.success).toBe(false);
  });

  it("rejects pageSize exceeding 25", () => {
    const result = analysisHistoryFilterSchema.safeParse({ pageSize: "26" });
    expect(result.success).toBe(false);
  });

  it("accepts pageSize at exactly 25", () => {
    const result = analysisHistoryFilterSchema.safeParse({ pageSize: "25" });
    expect(result.success).toBe(true);
  });

  it("rejects pageSize of 0", () => {
    const result = analysisHistoryFilterSchema.safeParse({ pageSize: "0" });
    expect(result.success).toBe(false);
  });
});

describe("analysisHistoryFilterSchema", () => {
  it("defaults to page 1, pageSize 10 with no filters", () => {
    const result = analysisHistoryFilterSchema.safeParse({});
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.page).toBe(1);
      expect(result.data.pageSize).toBe(10);
      expect(result.data.status).toBeUndefined();
      expect(result.data.deploymentStatus).toBeUndefined();
    }
  });

  it("accepts valid status filter", () => {
    const result = analysisHistoryFilterSchema.safeParse({ status: "COMPLETED" });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.status).toBe("COMPLETED");
    }
  });

  it("accepts valid deploymentStatus filter", () => {
    const result = analysisHistoryFilterSchema.safeParse({ deploymentStatus: "READY" });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.deploymentStatus).toBe("READY");
    }
  });

  it("rejects invalid status", () => {
    const result = analysisHistoryFilterSchema.safeParse({ status: "INVALID" });
    expect(result.success).toBe(false);
  });

  it("rejects invalid deploymentStatus", () => {
    const result = analysisHistoryFilterSchema.safeParse({ deploymentStatus: "INVALID" });
    expect(result.success).toBe(false);
  });

  it("rejects pageSize exceeding 25", () => {
    const result = analysisHistoryFilterSchema.safeParse({ pageSize: "30" });
    expect(result.success).toBe(false);
  });
});

describe("findingFilterSchema", () => {
  it("accepts empty filter (all findings)", () => {
    const result = findingFilterSchema.safeParse({});
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.severity).toBeUndefined();
    }
  });

  it("accepts valid severity", () => {
    const result = findingFilterSchema.safeParse({ severity: "CRITICAL" });
    expect(result.success).toBe(true);
  });

  it("accepts all valid severities", () => {
    for (const sev of ["CRITICAL", "HIGH", "MEDIUM", "LOW"]) {
      const result = findingFilterSchema.safeParse({ severity: sev });
      expect(result.success).toBe(true);
    }
  });

  it("rejects invalid severity", () => {
    const result = findingFilterSchema.safeParse({ severity: "INFO" });
    expect(result.success).toBe(false);
  });
});

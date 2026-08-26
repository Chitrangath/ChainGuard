import { describe, it, expect, vi } from "vitest";
import { runAnalysis, type AnalysisContext } from "../analyzer";

vi.mock("../db", () => ({
  getDb: () => ({
    analysis: {
      update: vi.fn().mockResolvedValue({}),
    },
    finding: {
      createMany: vi.fn().mockResolvedValue({}),
    },
  }),
}));

describe("runAnalysis", () => {
  const baseContext: AnalysisContext = {
    analysisId: "test-analysis-id",
    projectId: "test-project-id",
    repositoryUrl: "https://github.com/example/repo",
    projectDir: "/tmp/test",
  };

  it("rejects invalid repository URLs", async () => {
    const result = await runAnalysis({
      ...baseContext,
      repositoryUrl: "not-a-valid-url",
    });
    expect(result.success).toBe(false);
    expect(result.error).toContain("Invalid repository URL");
  });

  it("rejects non-GitHub URLs", async () => {
    const result = await runAnalysis({
      ...baseContext,
      repositoryUrl: "https://gitlab.com/some/repo",
    });
    expect(result.success).toBe(false);
    expect(result.error).toContain("Invalid repository URL");
  });

  it("returns AnalysisResult type", async () => {
    const result = await runAnalysis({
      ...baseContext,
      repositoryUrl: "https://github.com/example/repo",
    });
    expect(typeof result.success).toBe("boolean");
    expect(result).toHaveProperty("success");
  });
});

import { describe, it, expect } from "vitest";
import { runAnalysis, type AnalysisContext } from "../analyzer";

describe("runAnalysis", () => {
  const baseContext: AnalysisContext = {
    analysisId: "test-analysis-id",
    projectId: "test-project-id",
    repositoryUrl: "https://github.com/example/repo",
    projectDir: "/tmp/test",
  };

  it("returns success for placeholder analysis", async () => {
    const result = await runAnalysis(baseContext);
    expect(result.success).toBe(true);
    expect(result.error).toBeUndefined();
  });

  it("returns AnalysisResult type", async () => {
    const result = await runAnalysis(baseContext);
    expect(typeof result.success).toBe("boolean");
  });
});

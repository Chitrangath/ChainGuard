export interface AnalysisContext {
  analysisId: string;
  projectId: string;
  repositoryUrl: string;
  projectDir: string;
}

export interface AnalysisResult {
  success: boolean;
  error?: string;
}

export async function runAnalysis(
  _ctx: AnalysisContext, // eslint-disable-line @typescript-eslint/no-unused-vars
): Promise<AnalysisResult> {
  // Phase 3 placeholder: verify the async pipeline works.
  // Phase 4 will add git clone, Foundry, and Slither execution here.
  //
  // This intentionally does NOT produce fake findings or fake risk scores.
  return { success: true };
}

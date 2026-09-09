export type ProjectType =
  | "FOUNDRY"
  | "HARDHAT"
  | "TRUFFLE"
  | "STANDALONE_SOLIDITY"
  | "UNKNOWN_SOLIDITY";

export type PipelineJobStatus = "COMPLETED" | "FAILED" | "INCOMPLETE";

export type SecurityAnalysisStatus =
  | "PASS"
  | "FAIL"
  | "NOT_RUN"
  | "UNSUPPORTED"
  | "NO_CONTRACTS_FOUND";

export type DeploymentEvidenceStatus =
  | "FULL"
  | "PARTIAL"
  | "FAILED";

export type GateReason =
  | "SCORE_BELOW_THRESHOLD"
  | "CRITICAL_FINDINGS"
  | "COMPILATION_FAILED"
  | "COMPILATION_UNSUPPORTED"
  | "NO_TESTS"
  | "TESTS_NOT_RUN"
  | "TESTS_FAILED"
  | "TESTS_ERROR"
  | "STATIC_ANALYSIS_FAILED"
  | "STATIC_ANALYSIS_NOT_RUN"
  | "STATIC_ANALYSIS_UNSUPPORTED"
  | "UNSUPPORTED_COMPILER"
  | "UNSUPPORTED_TOOLCHAIN"
  | "NO_CONTRACTS_FOUND"
  | "INCOMPLETE_ANALYSIS";

export interface CompilationResultSuccess {
  status: "PASS";
  compilerVersion: string;
  contractsCompiled: number;
  contractsTargeted: number;
}

export interface CompilationResultFailure {
  status: "FAIL";
  reasonCode: string;
  safeMessage: string;
}

export interface CompilationResultUnsupported {
  status: "UNSUPPORTED";
  reasonCode: string;
  safeMessage: string;
}

export type CompilationResult =
  | CompilationResultSuccess
  | CompilationResultFailure
  | CompilationResultUnsupported;

export interface TestResultPass {
  status: "PASS";
  totalTests: number;
  passedTests: number;
  failedTests: number;
}

export interface TestResultFail {
  status: "FAIL";
  totalTests: number;
  passedTests: number;
  failedTests: number;
}

export interface TestResultNoTests {
  status: "NO_TESTS";
  reasonCode: string;
}

export interface TestResultNotRun {
  status: "NOT_RUN";
  reasonCode: string;
}

export interface TestResultError {
  status: "ERROR";
  reasonCode: string;
  safeMessage: string;
}

export type TestResult =
  | TestResultPass
  | TestResultFail
  | TestResultNoTests
  | TestResultNotRun
  | TestResultError;

export interface StaticAnalysisResultSuccess {
  status: "PASS";
  findings: Array<{
    severity: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
    type: string;
    contract: string | null;
    file: string | null;
    line: number | null;
    description: string;
    source: string;
    scope: "FIRST_PARTY" | "DEPENDENCY" | "GENERATED" | "UNKNOWN";
  }>;
  contractsScanned: number;
  tool: "SLITHER";
}

export interface StaticAnalysisResultFailure {
  status: "FAIL";
  reasonCode: string;
  safeMessage: string;
}

export interface StaticAnalysisResultNotRun {
  status: "NOT_RUN";
  reasonCode: string;
  safeMessage: string;
}

export type StaticAnalysisResult =
  | StaticAnalysisResultSuccess
  | StaticAnalysisResultFailure
  | StaticAnalysisResultNotRun;

export interface AnalysisTarget {
  root: string;
  projectType: ProjectType;
  sourcePaths: string[];
  configPath: string | null;
  compiler: CompilerSelection;
  testAvailability: TestAvailability;
  dependencyStrategy: DependencyStrategy;
}

export interface CompilerSelection {
  version: string;
  path: string;
  viaIr: boolean;
  optimizationRuns: number | null;
}

export interface TestAvailability {
  hasTests: boolean;
  testPaths: string[];
}

export interface DependencyStrategy {
  type: "foundry_lib" | "npm" | "none";
  paths: string[];
}

export interface DiscoveryResult {
  firstPartyContracts: string[];
  dependencyContracts: string[];
  generatedContracts: string[];
  projectRoots: string[];
  rejected: Array<{ filePath: string; reason: string }>;
}

export interface SubmoduleValidationResult {
  valid: boolean;
  urls: Array<{ name: string; path: string; resolvedUrl: string; valid: boolean }>;
  rejected: Array<{ name: string; url: string; reason: string }>;
  reason?: string;
}

export interface PipelineResult {
  jobStatus: PipelineJobStatus;
  projectType: ProjectType | null;
  compilerVersion: string | null;
  contractsDiscovered: number;
  contractsCompiled: number | null;
  contractsTargetedForScan: number | null;
  compilation: CompilationResult;
  tests: TestResult;
  staticAnalysis: StaticAnalysisResult;
  securityAnalysisStatus: SecurityAnalysisStatus;
  deploymentEvidenceStatus: DeploymentEvidenceStatus;
  gateReasons: GateReason[];
  riskScore: number | null;
  deploymentStatus: "READY" | "BLOCKED";
}

import type { Severity } from "../generated/prisma/enums";
import type { StaticAnalysisResult } from "../../worker/types";

type SlitherImpact = "High" | "Medium" | "Low" | "Informational";

const SLITHER_SEVERITY_MAP: Record<SlitherImpact, Severity> = {
  High: "CRITICAL",
  Medium: "HIGH",
  Low: "MEDIUM",
  Informational: "LOW",
};

interface SlitherElement {
  source_mapping: {
    filename_relative: string;
    start: number;
    length: number;
    lines?: (string | number)[];
  };
  type: string;
  name?: string;
}

interface SlitherDetector {
  check: string;
  impact: SlitherImpact;
  confidence: string;
  description: string;
  elements: SlitherElement[];
}

interface SlitherOutput {
  success?: boolean;
  error?: string;
  results?: {
    detectors: SlitherDetector[];
  };
}

export interface ParsedFinding {
  severity: Severity;
  type: string;
  contract: string | null;
  file: string | null;
  line: number | null;
  description: string;
  source: string;
  scope: "FIRST_PARTY" | "DEPENDENCY" | "GENERATED" | "UNKNOWN";
}

export interface SourceScopeManifest {
  firstParty: string[];
  dependency: string[];
  generated: string[];
}

function normalizeEvidencePath(filename: string): string | null {
  const candidate = filename.replaceAll("\\", "/").replace(/^\.\//, "");
  if (!candidate || candidate.startsWith("/") || /^[A-Za-z]:\//.test(candidate)) return null;
  const parts = candidate.split("/");
  if (parts.some((part) => !part || part === "." || part === "..")) return null;
  return parts.join("/");
}

function pathScope(filename: string, manifest: SourceScopeManifest): ParsedFinding["scope"] {
  const normalized = normalizeEvidencePath(filename);
  if (!normalized) return "UNKNOWN";
  if (manifest.firstParty.includes(normalized)) return "FIRST_PARTY";
  const segments = normalized.split("/");
  if (manifest.dependency.includes(normalized) || segments.includes("lib") || segments.includes("node_modules")) return "DEPENDENCY";
  if (manifest.generated.includes(normalized) || segments.some((segment) => ["out", "artifacts", "build", "cache"].includes(segment))) return "GENERATED";
  return "UNKNOWN";
}

function extractScope(elements: SlitherElement[], manifest: SourceScopeManifest): ParsedFinding["scope"] {
  const scopes = elements.map((element) =>
    pathScope(element.source_mapping?.filename_relative ?? "", manifest),
  );
  if (scopes.includes("FIRST_PARTY")) return "FIRST_PARTY";
  if (scopes.includes("DEPENDENCY")) return "DEPENDENCY";
  if (scopes.includes("GENERATED")) return "GENERATED";
  return "UNKNOWN";
}

function extractContract(elements: SlitherElement[]): string | null {
  for (const el of elements) {
    if (el.type === "contract" && el.name) {
      return el.name;
    }
  }
  return null;
}

function extractLocation(elements: SlitherElement[]): { file: string | null; line: number | null } {
  for (const el of elements) {
    const mapping = el.source_mapping;
    if (mapping?.filename_relative) {
      const firstLine = mapping.lines?.[0];
      const line =
        typeof firstLine === "number"
          ? firstLine
          : typeof firstLine === "string"
            ? parseInt(firstLine.split("-")[0], 10)
            : null;
      return {
        file: mapping.filename_relative,
        line: line !== null && isNaN(line) ? null : line,
      };
    }
  }
  return { file: null, line: null };
}

export function parseSlitherOutput(rawJson: string, manifest: SourceScopeManifest = { firstParty: [], dependency: [], generated: [] }): ParsedFinding[] {
  let parsed: SlitherOutput;
  try {
    parsed = JSON.parse(rawJson) as SlitherOutput;
  } catch {
    return [];
  }

  const detectors = parsed.results?.detectors;
  if (!Array.isArray(detectors)) {
    return [];
  }

  return detectors.map((detector) => {
    const severity = SLITHER_SEVERITY_MAP[detector.impact] ?? "LOW";
    const contract = extractContract(detector.elements);
    const { file, line } = extractLocation(detector.elements);

    return {
      severity,
      type: detector.check,
      contract,
      file,
      line,
      description: detector.description,
      source: "slither",
      scope: extractScope(detector.elements, manifest),
    };
  });
}

export function classifySlitherResult(
  rawJson: string,
  exitCode: number,
  stderr: string,
  contractsTargeted: number,
  manifest: SourceScopeManifest = { firstParty: [], dependency: [], generated: [] },
): StaticAnalysisResult {
  if (["TIMEOUT", "OUTPUT_LIMIT", "ABORTED", "SPAWN_FAILED"].includes(stderr)) {
    return {
      status: "FAIL",
      reasonCode: stderr,
      safeMessage: "Slither execution failed safely",
    };
  }

  if (!rawJson || rawJson.trim() === "") {
    return {
      status: "FAIL",
      reasonCode: "EMPTY_OUTPUT",
      safeMessage: "Slither produced no output",
    };
  }

  let parsed: SlitherOutput;
  try {
    parsed = JSON.parse(rawJson) as SlitherOutput;
  } catch {
    return {
      status: "FAIL",
      reasonCode: "INVALID_OUTPUT",
      safeMessage: "Slither produced invalid JSON output",
    };
  }

  if (parsed.success === false && !parsed.results?.detectors?.length) {
    return {
      status: "FAIL",
      reasonCode: "SLITHER_INTERNAL_FAILURE",
      safeMessage: parsed.error ?? "Slither reported an internal failure",
    };
  }

  if (contractsTargeted === 0) {
    return {
      status: "FAIL",
      reasonCode: "ZERO_CONTRACTS_SCANNED",
      safeMessage: "No contracts were submitted to Slither",
    };
  }

  const detectors = parsed.results?.detectors;
  if (!Array.isArray(detectors)) {
    return {
      status: "FAIL",
      reasonCode: "INVALID_OUTPUT",
      safeMessage: "Slither output missing detector results",
    };
  }

  const findings = parseSlitherOutput(rawJson, manifest);

  return {
    status: "PASS",
    findings,
    contractsScanned: contractsTargeted,
    tool: "SLITHER",
  };
}

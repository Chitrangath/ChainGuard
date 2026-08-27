import type { Severity } from "../generated/prisma/enums";

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

export function parseSlitherOutput(rawJson: string): ParsedFinding[] {
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
    };
  });
}

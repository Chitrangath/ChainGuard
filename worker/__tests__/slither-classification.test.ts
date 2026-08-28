import { describe, it, expect } from "vitest";
import {
  parseSlitherOutput,
  classifySlitherResult,
} from "../../src/lib/analysis-parser";

const VALID_SLITHER_ZERO_FINDINGS = {
  success: true,
  results: { detectors: [] },
};

const VALID_SLITHER_WITH_FINDINGS = {
  success: true,
  results: {
    detectors: [
      {
        check: "reentrancy-eth",
        impact: "High" as const,
        confidence: "Medium",
        description: "Reentrancy in Vault.withdraw(uint256)",
        elements: [
          {
            type: "function",
            name: "withdraw",
            source_mapping: {
              filename_relative: "src/Vault.sol",
              start: 220,
              length: 328,
              lines: [11],
            },
          },
          {
            type: "contract",
            name: "Vault",
            source_mapping: {
              filename_relative: "src/Vault.sol",
              start: 57,
              length: 493,
              lines: [4],
            },
          },
        ],
      },
    ],
  },
};

const VALID_SLITHER_INTERNAL_FAILURE = {
  success: false,
  error: "Compiler error",
  results: { detectors: [] },
};

describe("parseSlitherOutput", () => {
  it("parses valid JSON with zero findings", () => {
    const findings = parseSlitherOutput(JSON.stringify(VALID_SLITHER_ZERO_FINDINGS));
    expect(findings).toEqual([]);
  });

  it("parses valid JSON with findings", () => {
    const findings = parseSlitherOutput(JSON.stringify(VALID_SLITHER_WITH_FINDINGS));
    expect(findings).toHaveLength(1);
    expect(findings[0].severity).toBe("CRITICAL");
  });

  it("returns empty array for invalid JSON (parse failure)", () => {
    expect(parseSlitherOutput("not json")).toEqual([]);
  });

  it("returns empty array for empty string", () => {
    expect(parseSlitherOutput("")).toEqual([]);
  });

  it("returns empty array when no detectors key", () => {
    expect(parseSlitherOutput(JSON.stringify({ success: true }))).toEqual([]);
  });
});

describe("classifySlitherResult", () => {
  it("returns PASS with valid JSON and zero findings", () => {
    const result = classifySlitherResult(
      JSON.stringify(VALID_SLITHER_ZERO_FINDINGS),
      0,
      "",
      5,
    );
    expect(result.status).toBe("PASS");
    if (result.status === "PASS") {
      expect(result.findings).toEqual([]);
      expect(result.contractsScanned).toBe(5);
    }
  });

  it("returns PASS with valid JSON and findings (nonzero exit)", () => {
    const result = classifySlitherResult(
      JSON.stringify(VALID_SLITHER_WITH_FINDINGS),
      1,
      "Detectors found",
      5,
    );
    expect(result.status).toBe("PASS");
    if (result.status === "PASS") {
      expect(result.findings).toHaveLength(1);
    }
  });

  it("returns FAIL for empty output string", () => {
    const result = classifySlitherResult("", 1, "", 0);
    expect(result.status).toBe("FAIL");
    if (result.status === "FAIL") {
      expect(result.reasonCode).toBe("EMPTY_OUTPUT");
    }
  });

  it("returns FAIL for invalid JSON", () => {
    const result = classifySlitherResult("not json", 1, "", 0);
    expect(result.status).toBe("FAIL");
    if (result.status === "FAIL") {
      expect(result.reasonCode).toBe("INVALID_OUTPUT");
    }
  });

  it("returns FAIL for timeout", () => {
    const result = classifySlitherResult("", -1, "TIMEOUT", 0);
    expect(result.status).toBe("FAIL");
    if (result.status === "FAIL") {
      expect(result.reasonCode).toBe("TIMEOUT");
    }
  });

  it("returns FAIL when Slither reports internal failure with no detectors", () => {
    const result = classifySlitherResult(
      JSON.stringify(VALID_SLITHER_INTERNAL_FAILURE),
      1,
      "",
      0,
    );
    expect(result.status).toBe("FAIL");
    if (result.status === "FAIL") {
      expect(result.reasonCode).toBe("SLITHER_INTERNAL_FAILURE");
    }
  });

  it("returns FAIL for zero-contract scan", () => {
    const result = classifySlitherResult(
      JSON.stringify(VALID_SLITHER_ZERO_FINDINGS),
      0,
      "",
      0,
    );
    expect(result.status).toBe("FAIL");
    if (result.status === "FAIL") {
      expect(result.reasonCode).toBe("ZERO_CONTRACTS_SCANNED");
    }
  });

  it("returns FAIL for malformed JSON", () => {
    const result = classifySlitherResult("{", 1, "", 0);
    expect(result.status).toBe("FAIL");
  });
});

import { describe, it, expect } from "vitest";
import { parseSlitherOutput } from "../../src/lib/analysis-parser";

const SLITHER_OUTPUT_REENTRANCY = {
  success: true,
  results: {
    detectors: [
      {
        check: "reentrancy-eth",
        impact: "High" as const,
        confidence: "Medium",
        description:
          "Reentrancy in Vault.withdraw(uint256) (src/Vault.sol#11-17):\n\tExternal calls:\n\t- (sent,None) = msg.sender.call{value: amount}() (src/Vault.sol#14)\n\tState variables written after the call(s):\n\t- balances[msg.sender] -= amount (src/Vault.sol#16)",
        elements: [
          {
            type: "function",
            name: "withdraw",
            source_mapping: {
              filename_relative: "src/Vault.sol",
              start: 220,
              length: 328,
              lines: [11, 12, 13, 14, 15, 16, 17],
            },
          },
          {
            type: "contract",
            name: "Vault",
            source_mapping: {
              filename_relative: "src/Vault.sol",
              start: 57,
              length: 493,
              lines: [4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17],
            },
          },
        ],
      },
      {
        check: "solc-version",
        impact: "Informational" as const,
        confidence: "High",
        description:
          "Version constraint ^0.8.0 contains known severe issues",
        elements: [
          {
            type: "file",
            name: "src/Vault.sol",
            source_mapping: {
              filename_relative: "src/Vault.sol",
              start: 0,
              length: 50,
              lines: [2],
            },
          },
        ],
      },
    ],
  },
};

const SLITHER_OUTPUT_WITH_STRING_LINES = {
  success: true,
  results: {
    detectors: [
      {
        check: "reentrancy-eth",
        impact: "Medium" as const,
        confidence: "Medium",
        description: "Reentrancy found",
        elements: [
          {
            type: "function",
            name: "withdraw",
            source_mapping: {
              filename_relative: "src/Vault.sol",
              start: 100,
              length: 200,
              lines: ["11-17"],
            },
          },
        ],
      },
    ],
  },
};

describe("parseSlitherOutput", () => {
  it("parses numeric lines array from real Slither output", () => {
    const findings = parseSlitherOutput(JSON.stringify(SLITHER_OUTPUT_REENTRANCY));
    expect(findings).toHaveLength(2);
    expect(findings[0].severity).toBe("CRITICAL");
    expect(findings[0].type).toBe("reentrancy-eth");
    expect(findings[0].file).toBe("src/Vault.sol");
    expect(findings[0].line).toBe(11);
    expect(findings[0].contract).toBe("Vault");
    expect(findings[1].severity).toBe("LOW");
    expect(findings[1].type).toBe("solc-version");
  });

  it("parses string lines array (legacy format)", () => {
    const findings = parseSlitherOutput(JSON.stringify(SLITHER_OUTPUT_WITH_STRING_LINES));
    expect(findings).toHaveLength(1);
    expect(findings[0].line).toBe(11);
  });

  it("returns empty array for invalid JSON", () => {
    expect(parseSlitherOutput("not json")).toEqual([]);
  });

  it("returns empty array when no detectors", () => {
    expect(parseSlitherOutput(JSON.stringify({ success: true, results: {} }))).toEqual([]);
  });
});

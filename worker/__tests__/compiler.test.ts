import { describe, it, expect } from "vitest";
import {
  selectCompiler,
  parsePragma,
  parseFoundryToml,
} from "../compiler";

describe("parsePragma", () => {
  it("parses exact version pragma", () => {
    const result = parsePragma('pragma solidity 0.8.20;');
    expect(result).toEqual(["0.8.20"]);
  });

  it("parses caret range pragma", () => {
    const result = parsePragma("pragma solidity ^0.8.24;");
    expect(result).toEqual(["^0.8.24"]);
  });

  it("parses range pragma", () => {
    const result = parsePragma("pragma solidity >=0.8.0 <0.9.0;");
    expect(result).toEqual([">=0.8.0", "<0.9.0"]);
  });

  it("returns empty array for no pragma", () => {
    const result = parsePragma("contract Vault {}");
    expect(result).toEqual([]);
  });

  it("parses multiple pragma statements", () => {
    const result = parsePragma(
      "pragma solidity ^0.8.0;\n// comment\npragma abicoder v2;",
    );
    expect(result).toContain("^0.8.0");
  });
});

describe("parseFoundryToml", () => {
  it("extracts solc_version", () => {
    const content = `[profile.default]\nsolc_version = "0.8.24"\nvia_ir = true`;
    const result = parseFoundryToml(content);
    expect(result.solcVersion).toBe("0.8.24");
    expect(result.viaIr).toBe(true);
  });

  it("handles missing solc_version", () => {
    const content = `[profile.default]\nvia_ir = false`;
    const result = parseFoundryToml(content);
    expect(result.solcVersion).toBeNull();
    expect(result.viaIr).toBe(false);
  });

  it("handles empty content", () => {
    const result = parseFoundryToml("");
    expect(result.solcVersion).toBeNull();
    expect(result.viaIr).toBe(false);
  });

  it("handles optimization runs", () => {
    const content = `[profile.default]\noptimizer_runs = 200`;
    const result = parseFoundryToml(content);
    expect(result.optimizerRuns).toBe(200);
  });
});

describe("selectCompiler", () => {
  const availableCompilers = [
    "/usr/local/lib/solc-0.8.20",
    "/usr/local/lib/solc-0.8.24",
  ];

  it("selects matching compiler for exact version", () => {
    const result = selectCompiler(["0.8.24"], availableCompilers);
    expect(result.version).toBe("0.8.24");
    expect(result.path).toBe("/usr/local/lib/solc-0.8.24");
  });

  it("selects compatible compiler for caret range", () => {
    const result = selectCompiler(["^0.8.20"], availableCompilers);
    expect(result.version).toBe("0.8.20");
  });

  it("selects lowest compatible for caret range", () => {
    const result = selectCompiler(["^0.8.20"], availableCompilers);
    expect(result.version).toBe("0.8.20");
  });

  it("returns UNSUPPORTED for incompatible version", () => {
    const result = selectCompiler(["0.7.0"], availableCompilers);
    expect(result.version).toBe("UNSUPPORTED");
  });

  it("selects first available for no pragma", () => {
    const result = selectCompiler([], availableCompilers);
    expect(result.version).toBe("0.8.20");
  });

  it("selects lowest compatible for range pragma", () => {
    const result = selectCompiler([">=0.8.0", "<0.9.0"], availableCompilers);
    expect(result.version).toBe("0.8.20");
  });
});

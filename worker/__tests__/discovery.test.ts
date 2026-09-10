import { describe, it, expect, beforeEach, afterEach } from "vitest";
import * as fs from "fs";
import * as path from "path";
import { discoverSolidityFiles, type DiscoveryResult } from "../discovery";

const TEST_DIR = "/tmp/guardrails-test-discovery";

function createFile(relPath: string, content: string) {
  const full = path.join(TEST_DIR, relPath);
  fs.mkdirSync(path.dirname(full), { recursive: true });
  fs.writeFileSync(full, content);
}

function cleanup() {
  if (fs.existsSync(TEST_DIR)) {
    fs.rmSync(TEST_DIR, { recursive: true, force: true });
  }
}

beforeEach(cleanup);
afterEach(cleanup);

describe("discoverSolidityFiles", () => {
  it("discovers root-level standalone contracts", () => {
    createFile("Contract.sol", "pragma solidity ^0.8.0;");
    const result = discoverSolidityFiles(TEST_DIR);
    expect(result.firstPartyContracts).toEqual(["Contract.sol"]);
    expect(result.dependencyContracts).toEqual([]);
    expect(result.rejected).toEqual([]);
  });

  it("discovers nested contracts in src/", () => {
    createFile("src/Vault.sol", "pragma solidity ^0.8.0;");
    createFile("src/token/Token.sol", "pragma solidity ^0.8.0;");
    const result = discoverSolidityFiles(TEST_DIR);
    expect(result.firstPartyContracts).toHaveLength(2);
  });

  it("excludes .git directory", () => {
    createFile(".git/hooks/pre-commit", "pragma solidity ^0.8.0;");
    createFile("src/Real.sol", "pragma solidity ^0.8.0;");
    const result = discoverSolidityFiles(TEST_DIR);
    expect(result.firstPartyContracts).toEqual(["src/Real.sol"]);
  });

  it("excludes node_modules from first-party", () => {
    createFile("node_modules/@openzeppelin/Token.sol", "pragma solidity ^0.8.0;");
    createFile("src/Vault.sol", "pragma solidity ^0.8.0;");
    const result = discoverSolidityFiles(TEST_DIR);
    expect(result.firstPartyContracts).toEqual(["src/Vault.sol"]);
  });

  it("excludes out/ directory", () => {
    createFile("out/Vault.sol", "pragma solidity ^0.8.0;");
    createFile("src/Vault.sol", "pragma solidity ^0.8.0;");
    const result = discoverSolidityFiles(TEST_DIR);
    expect(result.firstPartyContracts).toEqual(["src/Vault.sol"]);
    expect(result.generatedContracts).toEqual(["out/Vault.sol"]);
  });

  it("excludes cache/ directory", () => {
    createFile("cache/solc/Vault.sol", "pragma solidity ^0.8.0;");
    createFile("src/Vault.sol", "pragma solidity ^0.8.0;");
    const result = discoverSolidityFiles(TEST_DIR);
    expect(result.firstPartyContracts).toEqual(["src/Vault.sol"]);
    expect(result.generatedContracts).toEqual(["cache/solc/Vault.sol"]);
  });

  it("excludes artifacts/ directory", () => {
    createFile("artifacts/Vault.sol", "pragma solidity ^0.8.0;");
    createFile("src/Vault.sol", "pragma solidity ^0.8.0;");
    const result = discoverSolidityFiles(TEST_DIR);
    expect(result.firstPartyContracts).toEqual(["src/Vault.sol"]);
    expect(result.generatedContracts).toEqual(["artifacts/Vault.sol"]);
  });

  it("excludes build/ directory", () => {
    createFile("build/Vault.sol", "pragma solidity ^0.8.0;");
    createFile("src/Vault.sol", "pragma solidity ^0.8.0;");
    const result = discoverSolidityFiles(TEST_DIR);
    expect(result.firstPartyContracts).toEqual(["src/Vault.sol"]);
    expect(result.generatedContracts).toEqual(["build/Vault.sol"]);
  });

  it("excludes coverage/ directory", () => {
    createFile("coverage/Vault.sol", "pragma solidity ^0.8.0;");
    createFile("src/Vault.sol", "pragma solidity ^0.8.0;");
    const result = discoverSolidityFiles(TEST_DIR);
    expect(result.firstPartyContracts).toEqual(["src/Vault.sol"]);
  });

  it("marks lib/ as dependency", () => {
    createFile("lib/openzeppelin/contracts/Token.sol", "pragma solidity ^0.8.0;");
    createFile("src/Vault.sol", "pragma solidity ^0.8.0;");
    const result = discoverSolidityFiles(TEST_DIR);
    expect(result.firstPartyContracts).toEqual(["src/Vault.sol"]);
    expect(result.dependencyContracts).toEqual([
      "lib/openzeppelin/contracts/Token.sol",
    ]);
  });

  it("marks lib inside a nested project root as dependency", () => {
    createFile("smart contracts/src/Vault.sol", "pragma solidity ^0.8.24;");
    createFile("smart contracts/lib/forge-std/Test.sol", "pragma solidity ^0.8.24;");
    const result = discoverSolidityFiles(TEST_DIR);
    expect(result.firstPartyContracts).toEqual(["smart contracts/src/Vault.sol"]);
    expect(result.dependencyContracts).toEqual(["smart contracts/lib/forge-std/Test.sol"]);
  });

  it("does not treat dependency Foundry packages as first-party project roots", () => {
    createFile("app/foundry.toml", "[profile.default]");
    createFile("app/src/Vault.sol", "pragma solidity 0.8.24;");
    createFile("app/lib/dependency/foundry.toml", "[profile.default]");
    createFile("app/lib/dependency/src/Dependency.sol", "pragma solidity 0.8.24;");
    const result = discoverSolidityFiles(TEST_DIR);
    expect(result.projectRoots).toEqual([path.join(TEST_DIR, "app")]);
  });

  it("returns empty arrays for no Solidity files", () => {
    createFile("README.md", "# Hello");
    const result = discoverSolidityFiles(TEST_DIR);
    expect(result.firstPartyContracts).toEqual([]);
    expect(result.dependencyContracts).toEqual([]);
  });

  it("rejects files exceeding max file size", () => {
    const bigContent = "pragma solidity ^0.8.0;\n".repeat(60000);
    createFile("src/Big.sol", bigContent);
    createFile("src/Small.sol", "pragma solidity ^0.8.0;");
    const result = discoverSolidityFiles(TEST_DIR, { maxFileSizeBytes: 500000 });
    expect(result.firstPartyContracts).toContain("src/Small.sol");
    expect(result.rejected.some((r) => r.filePath === "src/Big.sol")).toBe(true);
  });

  it("stops discovering after max file count", () => {
    for (let i = 0; i < 10; i++) {
      createFile(`src/Contract${i}.sol`, "pragma solidity ^0.8.0;");
    }
    const result = discoverSolidityFiles(TEST_DIR, { maxFiles: 5 });
    expect(result.firstPartyContracts.length).toBeLessThanOrEqual(5);
    expect(result.rejected.length).toBeGreaterThan(0);
  });

  it("rejects symlinks", () => {
    createFile("src/Real.sol", "pragma solidity ^0.8.0;");
    const linkPath = path.join(TEST_DIR, "src/Linked.sol");
    fs.symlinkSync(path.join(TEST_DIR, "src/Real.sol"), linkPath);
    const result = discoverSolidityFiles(TEST_DIR);
    expect(result.firstPartyContracts).toEqual(["src/Real.sol"]);
    expect(result.rejected.some((r) => r.filePath === "src/Linked.sol")).toBe(true);
  });

  it("rejects symlink pointing outside workspace", () => {
    const outsidePath = path.join(TEST_DIR, "src/Outside.sol");
    fs.mkdirSync(path.join(TEST_DIR, "src"), { recursive: true });
    fs.symlinkSync("/etc/passwd", outsidePath);
    const result = discoverSolidityFiles(TEST_DIR);
    expect(result.rejected.some((r) => r.reason === "symlink")).toBe(true);
  });

  it("detects project roots with foundry.toml", () => {
    createFile("foundry.toml", "[profile.default]\nsrc = 'src'");
    createFile("src/Vault.sol", "pragma solidity ^0.8.0;");
    const result = discoverSolidityFiles(TEST_DIR);
    expect(result.projectRoots).toContain(TEST_DIR);
  });

  it("detects nested project roots", () => {
    createFile("smart contracts/foundry.toml", "[profile.default]");
    createFile("smart contracts/src/Vault.sol", "pragma solidity ^0.8.24;");
    const result = discoverSolidityFiles(TEST_DIR);
    expect(result.projectRoots).toContain(
      path.join(TEST_DIR, "smart contracts"),
    );
  });

  it("detects multiple first-party Foundry roots for incomplete-policy handling", () => {
    createFile("alpha/foundry.toml", "[profile.default]");
    createFile("alpha/src/A.sol", "pragma solidity 0.8.20;");
    createFile("beta/foundry.toml", "[profile.default]");
    createFile("beta/src/B.sol", "pragma solidity 0.8.20;");
    const result = discoverSolidityFiles(TEST_DIR);
    expect(result.projectRoots).toEqual([path.join(TEST_DIR, "alpha"), path.join(TEST_DIR, "beta")]);
  });

  it("handles total source size limit", () => {
    for (let i = 0; i < 20; i++) {
      createFile(`src/Contract${i}.sol`, "pragma solidity ^0.8.0;\n" + "x".repeat(10000));
    }
    const result = discoverSolidityFiles(TEST_DIR, { maxTotalSourceSizeBytes: 50000 });
    expect(result.firstPartyContracts.length).toBeLessThanOrEqual(20);
    expect(
      result.firstPartyContracts.length < 20 ||
        result.rejected.some((r) => r.reason === "total_source_size_exceeded"),
    ).toBe(true);
  });

  it("reports bounded reason codes for every discovery limit", () => {
    createFile("src/deep/too/deep/Vault.sol", "pragma solidity ^0.8.20;");
    createFile("src/Big.sol", "x".repeat(100));
    const result = discoverSolidityFiles(TEST_DIR, { maxDepth: 1, maxFileSizeBytes: 50 });
    expect(result.reasonCodes).toEqual(["file_too_large", "max_depth_exceeded"]);
    expect(result.rejected).toHaveLength(2);
  });

  it("does not claim incomplete source coverage for deep non-source directories", () => {
    createFile("docs/deep/beyond/limit/README.md", "documentation");
    createFile("src/Vault.sol", "pragma solidity ^0.8.20;");
    const result = discoverSolidityFiles(TEST_DIR, { maxDepth: 1 });
    expect(result.reasonCodes).toEqual([]);
    expect(result.firstPartyContracts).toEqual(["src/Vault.sol"]);
  });

  it("handles empty directory", () => {
    const result = discoverSolidityFiles(TEST_DIR);
    expect(result.firstPartyContracts).toEqual([]);
    expect(result.dependencyContracts).toEqual([]);
    expect(result.projectRoots).toEqual([]);
  });

  it("returns correct relative paths", () => {
    createFile("src/nested/deep/Vault.sol", "pragma solidity ^0.8.0;");
    const result = discoverSolidityFiles(TEST_DIR);
    expect(result.firstPartyContracts).toEqual([
      "src/nested/deep/Vault.sol",
    ]);
  });
});

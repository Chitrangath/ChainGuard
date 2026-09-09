import { afterEach, describe, expect, it, vi } from "vitest";
import * as fs from "node:fs";
import * as path from "node:path";

const { runBoundedProcess } = vi.hoisted(() => ({ runBoundedProcess: vi.fn() }));
vi.mock("../process-runner", () => ({ runBoundedProcess }));

import { standaloneCompile } from "../adapters/standalone";

const created: string[] = [];
afterEach(() => {
  vi.clearAllMocks();
  for (const dir of created.splice(0)) fs.rmSync(dir, { recursive: true, force: true });
});

describe("standaloneCompile bounded execution", () => {
  it("returns a safe bounded failure when compiler stdout floods", async () => {
    const workspace = fs.mkdtempSync("/tmp/chainguard-standalone-");
    created.push(workspace);
    const root = path.join(workspace, "repo");
    fs.mkdirSync(root);
    fs.writeFileSync(path.join(root, "Vault.sol"), "pragma solidity 0.8.20; contract Vault {}");
    runBoundedProcess
      .mockResolvedValueOnce({ exitCode: -1, stdout: "", stderr: "OUTPUT_LIMIT", reasonCode: "OUTPUT_LIMIT" })
      .mockResolvedValueOnce({ exitCode: 0, stdout: "", stderr: "" });

    const result = await standaloneCompile({
      root,
      projectType: "STANDALONE_SOLIDITY",
      sourcePaths: ["Vault.sol"],
      configPath: null,
      compiler: { version: "0.8.20", path: "/usr/local/lib/solc-0.8.20", viaIr: false, optimizationRuns: null },
      testAvailability: { hasTests: false, testPaths: [] },
      dependencyStrategy: { type: "none", paths: [] },
    }, workspace);

    expect(result).toMatchObject({ status: "FAIL", reasonCode: "OUTPUT_LIMIT" });
    expect(runBoundedProcess).toHaveBeenNthCalledWith(2, "docker", expect.arrayContaining(["rm", "-f"]), expect.any(Object));
  });
});

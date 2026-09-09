import { describe, it, expect } from "vitest";
import * as fs from "node:fs";
import {
  validateSubmoduleUrl,
  validateAllSubmodules,
  parseGitmodules,
  prepareSubmodules,
  type GitmodulesEntry,
} from "../submodule";

describe("validateSubmoduleUrl", () => {
  it("accepts valid GitHub HTTPS URL", () => {
    const result = validateSubmoduleUrl(
      "https://github.com/OpenZeppelin/openzeppelin-contracts.git",
      "https://github.com/user/repo",
    );
    expect(result.valid).toBe(true);
  });

  it("accepts relative submodule URL resolved against parent", () => {
    const result = validateSubmoduleUrl(
      "../openzeppelin-contracts.git",
      "https://github.com/user/repo",
    );
    expect(result.valid).toBe(true);
    expect(result.resolvedUrl).toBe(
      "https://github.com/user/openzeppelin-contracts.git",
    );
  });

  it("rejects file:// URLs", () => {
    const result = validateSubmoduleUrl(
      "file:///home/user/local-repo",
      "https://github.com/user/repo",
    );
    expect(result.valid).toBe(false);
    expect(result.reason).toContain("file://");
  });

  it("rejects SSH URLs", () => {
    const result = validateSubmoduleUrl(
      "git@github.com:user/repo.git",
      "https://github.com/user/repo",
    );
    expect(result.valid).toBe(false);
    expect(result.reason).toContain("SSH");
  });

  it("rejects URLs with credentials", () => {
    const result = validateSubmoduleUrl(
      "https://user:pass@github.com/user/repo.git",
      "https://github.com/user/repo",
    );
    expect(result.valid).toBe(false);
    expect(result.reason).toContain("credentials");
  });

  it("rejects non-GitHub hosts", () => {
    const result = validateSubmoduleUrl(
      "https://gitlab.com/user/repo.git",
      "https://github.com/user/repo",
    );
    expect(result.valid).toBe(false);
    expect(result.reason).toContain("GitHub");
  });

  it("rejects absolute local paths", () => {
    const result = validateSubmoduleUrl(
      "/home/user/repo",
      "https://github.com/user/repo",
    );
    expect(result.valid).toBe(false);
  });

  it("rejects scp syntax", () => {
    const result = validateSubmoduleUrl(
      "git@github.com:user/repo.git",
      "https://github.com/user/repo",
    );
    expect(result.valid).toBe(false);
  });

  it("rejects path traversal in relative URLs", () => {
    const result = validateSubmoduleUrl(
      "../../attacker/repo.git",
      "https://github.com/user/repo",
    );
    expect(result.valid).toBe(false);
  });

  it("rejects relative URL resolving outside GitHub namespace", () => {
    const result = validateSubmoduleUrl(
      "../../attacker/repo.git",
      "https://github.com/user/repo",
    );
    expect(result.valid).toBe(false);
    expect(result.reason).toContain("namespace");
  });
});

describe("validateAllSubmodules", () => {
  it("validates multiple submodules", () => {
    const entries: GitmodulesEntry[] = [
      { name: "forge-std", path: "lib/forge-std", url: "https://github.com/foundry-rs/forge-std.git" },
      {
        name: "openzeppelin",
        path: "lib/openzeppelin-contracts", url: "https://github.com/OpenZeppelin/openzeppelin-contracts.git",
      },
    ];
    const result = validateAllSubmodules(entries, "https://github.com/user/repo");
    expect(result.valid).toBe(true);
    expect(result.urls).toHaveLength(2);
    expect(result.rejected).toEqual([]);
  });

  it("rejects when any submodule is invalid", () => {
    const entries: GitmodulesEntry[] = [
      { name: "forge-std", path: "lib/forge-std", url: "https://github.com/foundry-rs/forge-std.git" },
      { name: "bad", path: "lib/bad", url: "file:///etc/passwd" },
    ];
    const result = validateAllSubmodules(entries, "https://github.com/user/repo");
    expect(result.valid).toBe(false);
    expect(result.rejected).toHaveLength(1);
    expect(result.rejected[0].name).toBe("bad");
  });

  it("rejects too many submodules", () => {
    const entries: GitmodulesEntry[] = Array.from({ length: 25 }, (_, i) => ({
      name: `sub${i}`,
      path: `lib/sub${i}`,
      url: `https://github.com/user/sub${i}.git`,
    }));
    const result = validateAllSubmodules(entries, "https://github.com/user/repo");
    expect(result.valid).toBe(false);
    expect(result.reason).toContain("limit");
  });

  it("handles relative URLs in entries", () => {
    const entries: GitmodulesEntry[] = [
      { name: "std", path: "lib/forge-std", url: "../forge-std.git" },
    ];
    const result = validateAllSubmodules(entries, "https://github.com/user/repo");
    expect(result.valid).toBe(true);
    expect(result.urls[0].resolvedUrl).toBe(
      "https://github.com/user/forge-std.git",
    );
  });

  it("parses section name, path, and URL for TerraLink-style entries", () => {
    expect(parseGitmodules(`[submodule "forge-std"]\n path = smart contracts/lib/forge-std\n url = https://github.com/foundry-rs/forge-std.git\n`)).toEqual([
      { name: "forge-std", path: "smart contracts/lib/forge-std", url: "https://github.com/foundry-rs/forge-std.git" },
    ]);
  });

  it.each(["", "../outside", "/tmp/module", "lib/../outside"])("rejects invalid submodule path %j", (path) => {
    const result = validateAllSubmodules([{ name: "bad", path, url: "https://github.com/user/repo.git" }], "https://github.com/user/parent");
    expect(result.valid).toBe(false);
  });

  it("rejects duplicate paths and malformed entries", () => {
    const url = "https://github.com/user/repo.git";
    expect(validateAllSubmodules([
      { name: "one", path: "lib/shared", url },
      { name: "two", path: "lib/shared", url },
    ], "https://github.com/user/parent").valid).toBe(false);
    expect(validateAllSubmodules([{ name: "bad", path: "lib/bad", url: "" }], "https://github.com/user/parent").valid).toBe(false);
  });

  it("handles empty entries", () => {
    const result = validateAllSubmodules([], "https://github.com/user/repo");
    expect(result.valid).toBe(true);
    expect(result.urls).toEqual([]);
  });
});

describe("prepareSubmodules", () => {
  it("returns a safe incomplete reason when checkout fails", async () => {
    const dir = fs.mkdtempSync("/tmp/chainguard-submodule-failure-");
    try {
      fs.writeFileSync(`${dir}/.gitmodules`, `[submodule "dep"]\npath = lib/dep\nurl = https://github.com/user/dep.git\n`);
      const result = await prepareSubmodules(dir, "https://github.com/user/root", { run: async () => ({ exitCode: 1, stdout: "", stderr: "bounded" }) });
      expect(result).toEqual({ success: false, reason: "SUBMODULE_CHECKOUT_FAILED" });
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });
});

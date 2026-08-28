import { describe, it, expect } from "vitest";
import {
  validateSubmoduleUrl,
  validateAllSubmodules,
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
      { name: "forge-std", url: "https://github.com/foundry-rs/forge-std.git" },
      {
        name: "openzeppelin",
        url: "https://github.com/OpenZeppelin/openzeppelin-contracts.git",
      },
    ];
    const result = validateAllSubmodules(entries, "https://github.com/user/repo");
    expect(result.valid).toBe(true);
    expect(result.urls).toHaveLength(2);
    expect(result.rejected).toEqual([]);
  });

  it("rejects when any submodule is invalid", () => {
    const entries: GitmodulesEntry[] = [
      { name: "forge-std", url: "https://github.com/foundry-rs/forge-std.git" },
      { name: "bad", url: "file:///etc/passwd" },
    ];
    const result = validateAllSubmodules(entries, "https://github.com/user/repo");
    expect(result.valid).toBe(false);
    expect(result.rejected).toHaveLength(1);
    expect(result.rejected[0].name).toBe("bad");
  });

  it("rejects too many submodules", () => {
    const entries: GitmodulesEntry[] = Array.from({ length: 25 }, (_, i) => ({
      name: `sub${i}`,
      url: `https://github.com/user/sub${i}.git`,
    }));
    const result = validateAllSubmodules(entries, "https://github.com/user/repo");
    expect(result.valid).toBe(false);
    expect(result.reason).toContain("limit");
  });

  it("handles relative URLs in entries", () => {
    const entries: GitmodulesEntry[] = [
      { name: "std", url: "../forge-std.git" },
    ];
    const result = validateAllSubmodules(entries, "https://github.com/user/repo");
    expect(result.valid).toBe(true);
    expect(result.urls[0].resolvedUrl).toBe(
      "https://github.com/user/forge-std.git",
    );
  });

  it("handles empty entries", () => {
    const result = validateAllSubmodules([], "https://github.com/user/repo");
    expect(result.valid).toBe(true);
    expect(result.urls).toEqual([]);
  });
});

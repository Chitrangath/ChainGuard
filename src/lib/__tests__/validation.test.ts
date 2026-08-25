import { describe, it, expect } from "vitest";
import { createProjectSchema } from "../validation";

describe("createProjectSchema", () => {
  const validInput = {
    name: "DeFi Vault",
    repositoryUrl: "https://github.com/example/defi-vault",
    description: "Example Solidity project",
  };

  it("accepts valid input", () => {
    const result = createProjectSchema.safeParse(validInput);
    expect(result.success).toBe(true);
  });

  it("accepts input without description", () => {
    const result = createProjectSchema.safeParse({
      name: "DeFi Vault",
      repositoryUrl: "https://github.com/example/defi-vault",
    });
    expect(result.success).toBe(true);
  });

  it("rejects missing name", () => {
    const result = createProjectSchema.safeParse({
      repositoryUrl: "https://github.com/example/defi-vault",
    });
    expect(result.success).toBe(false);
  });

  it("rejects empty name", () => {
    const result = createProjectSchema.safeParse({
      name: "",
      repositoryUrl: "https://github.com/example/defi-vault",
    });
    expect(result.success).toBe(false);
  });

  it("rejects name exceeding 100 characters", () => {
    const result = createProjectSchema.safeParse({
      name: "A".repeat(101),
      repositoryUrl: "https://github.com/example/defi-vault",
    });
    expect(result.success).toBe(false);
  });

  it("rejects missing repositoryUrl", () => {
    const result = createProjectSchema.safeParse({
      name: "DeFi Vault",
    });
    expect(result.success).toBe(false);
  });

  it("rejects non-URL repositoryUrl", () => {
    const result = createProjectSchema.safeParse({
      name: "DeFi Vault",
      repositoryUrl: "not-a-url",
    });
    expect(result.success).toBe(false);
  });

  it("rejects non-GitHub URLs", () => {
    const result = createProjectSchema.safeParse({
      name: "DeFi Vault",
      repositoryUrl: "https://gitlab.com/owner/repo",
    });
    expect(result.success).toBe(false);
  });

  it("rejects HTTP GitHub URLs", () => {
    const result = createProjectSchema.safeParse({
      name: "DeFi Vault",
      repositoryUrl: "http://github.com/owner/repo",
    });
    expect(result.success).toBe(false);
  });

  it("rejects GitHub URLs with invalid path", () => {
    const result = createProjectSchema.safeParse({
      name: "DeFi Vault",
      repositoryUrl: "https://github.com/owner",
    });
    expect(result.success).toBe(false);
  });

  it("accepts GitHub URLs with subpath", () => {
    const result = createProjectSchema.safeParse({
      name: "DeFi Vault",
      repositoryUrl: "https://github.com/owner/repo/tree/main",
    });
    expect(result.success).toBe(true);
  });

  it("rejects description exceeding 500 characters", () => {
    const result = createProjectSchema.safeParse({
      ...validInput,
      description: "A".repeat(501),
    });
    expect(result.success).toBe(false);
  });

  it("accepts description at exactly 500 characters", () => {
    const result = createProjectSchema.safeParse({
      ...validInput,
      description: "A".repeat(500),
    });
    expect(result.success).toBe(true);
  });
});

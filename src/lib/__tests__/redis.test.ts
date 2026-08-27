import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Mock the redis module
vi.mock("redis", () => ({
  createClient: vi.fn(() => ({
    connect: vi.fn().mockResolvedValue(undefined),
    destroy: vi.fn(),
    isReady: false,
    isOpen: false,
    on: vi.fn(),
    get: vi.fn(),
    set: vi.fn(),
    del: vi.fn(),
  })),
}));

describe("redis client", () => {
  beforeEach(() => {
    vi.resetModules();
    process.env.REDIS_URL = "";
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns null when REDIS_URL is not set", async () => {
    const { getRedisClient } = await import("../redis");
    const client = await getRedisClient();
    expect(client).toBeNull();
  });

  it("returns null when REDIS_URL is empty string", async () => {
    process.env.REDIS_URL = "  ";
    const { getRedisClient } = await import("../redis");
    const client = await getRedisClient();
    expect(client).toBeNull();
  });

  it("isRedisAvailable returns false when no client", async () => {
    const { isRedisAvailable } = await import("../redis");
    const available = await isRedisAvailable();
    expect(available).toBe(false);
  });

  it("closeRedis does not throw when no client", async () => {
    const { closeRedis } = await import("../redis");
    await expect(closeRedis()).resolves.toBeUndefined();
  });
});

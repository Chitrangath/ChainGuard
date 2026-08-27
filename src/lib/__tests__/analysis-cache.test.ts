import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  buildCacheKey,
  isTerminal,
  createEnvelope,
  parseEnvelope,
  CACHE_TTL_SECONDS,
  CACHE_VERSION,
  KEY_PREFIX,
} from "../analysis-cache";

describe("analysis-cache", () => {
  describe("buildCacheKey", () => {
    it("returns correct key format", () => {
      expect(buildCacheKey("abc123")).toBe("analysis:abc123");
    });

    it("handles UUID-style IDs", () => {
      const id = "clx1234567890abcdef";
      expect(buildCacheKey(id)).toBe(`analysis:${id}`);
    });
  });

  describe("isTerminal", () => {
    it("returns true for COMPLETED", () => {
      expect(isTerminal("COMPLETED")).toBe(true);
    });

    it("returns true for FAILED", () => {
      expect(isTerminal("FAILED")).toBe(true);
    });

    it("returns false for QUEUED", () => {
      expect(isTerminal("QUEUED")).toBe(false);
    });

    it("returns false for RUNNING", () => {
      expect(isTerminal("RUNNING")).toBe(false);
    });

    it("returns false for unknown status", () => {
      expect(isTerminal("UNKNOWN")).toBe(false);
    });
  });

  describe("createEnvelope", () => {
    it("creates envelope with version and cachedAt", () => {
      const data = {
        id: "test-id",
        projectId: "proj-id",
        status: "COMPLETED",
        riskScore: 85,
        deploymentStatus: "READY",
        compilationStatus: "PASS",
        testStatus: "PASS",
        totalTests: 3,
        passedTests: 3,
        failedTests: 0,
        startedAt: "2024-01-01T00:00:00.000Z",
        completedAt: "2024-01-01T00:01:00.000Z",
        createdAt: "2024-01-01T00:00:00.000Z",
        findings: [],
      };

      const envelope = createEnvelope(data);
      expect(envelope.version).toBe(CACHE_VERSION);
      expect(envelope.cachedAt).toBeDefined();
      expect(envelope.analysis).toEqual(data);
    });
  });

  describe("parseEnvelope", () => {
    it("parses valid envelope", () => {
      const envelope = {
        version: CACHE_VERSION,
        cachedAt: "2024-01-01T00:00:00.000Z",
        analysis: {
          id: "test-id",
          projectId: "proj-id",
          status: "COMPLETED",
          riskScore: 85,
          deploymentStatus: "READY",
          compilationStatus: "PASS",
          testStatus: "PASS",
          totalTests: 3,
          passedTests: 3,
          failedTests: 0,
          startedAt: "2024-01-01T00:00:00.000Z",
          completedAt: "2024-01-01T00:01:00.000Z",
          createdAt: "2024-01-01T00:00:00.000Z",
          findings: [],
        },
      };

      const result = parseEnvelope(JSON.stringify(envelope));
      expect(result).toEqual(envelope);
    });

    it("returns null for malformed JSON", () => {
      expect(parseEnvelope("not json")).toBeNull();
    });

    it("returns null for invalid version", () => {
      const envelope = {
        version: 999,
        cachedAt: "2024-01-01T00:00:00.000Z",
        analysis: {},
      };
      expect(parseEnvelope(JSON.stringify(envelope))).toBeNull();
    });

    it("returns null for missing required fields", () => {
      const envelope = { version: CACHE_VERSION };
      expect(parseEnvelope(JSON.stringify(envelope))).toBeNull();
    });

    it("returns null for empty string", () => {
      expect(parseEnvelope("")).toBeNull();
    });
  });

  describe("constants", () => {
    it("TTL is 300 seconds", () => {
      expect(CACHE_TTL_SECONDS).toBe(300);
    });

    it("VERSION is 1", () => {
      expect(CACHE_VERSION).toBe(1);
    });

    it("KEY_PREFIX is analysis:", () => {
      expect(KEY_PREFIX).toBe("analysis:");
    });
  });
});

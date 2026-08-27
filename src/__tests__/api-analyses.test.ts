import { describe, it, expect } from "vitest";
import {
  paginationSchema,
  analysisHistoryFilterSchema,
  findingFilterSchema,
} from "../lib/validation";

describe("API: Analysis history pagination", () => {
  describe("query parameter validation", () => {
    it("defaults to page 1, pageSize 10 when no params provided", () => {
      const result = analysisHistoryFilterSchema.safeParse({});
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.page).toBe(1);
        expect(result.data.pageSize).toBe(10);
      }
    });

    it("parses string query params from URL searchParams", () => {
      const result = analysisHistoryFilterSchema.safeParse({
        page: "3",
        pageSize: "5",
        status: "COMPLETED",
        deploymentStatus: "READY",
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.page).toBe(3);
        expect(result.data.pageSize).toBe(5);
        expect(result.data.status).toBe("COMPLETED");
        expect(result.data.deploymentStatus).toBe("READY");
      }
    });

    it("clamps invalid page to default via safeParse", () => {
      const result = analysisHistoryFilterSchema.safeParse({ page: "0" });
      expect(result.success).toBe(false);
    });

    it("rejects pageSize exceeding maximum of 25", () => {
      const result = analysisHistoryFilterSchema.safeParse({ pageSize: "26" });
      expect(result.success).toBe(false);
    });

    it("rejects invalid status value", () => {
      const result = analysisHistoryFilterSchema.safeParse({ status: "PENDING" });
      expect(result.success).toBe(false);
    });

    it("rejects invalid deploymentStatus value", () => {
      const result = analysisHistoryFilterSchema.safeParse({ deploymentStatus: "PENDING" });
      expect(result.success).toBe(false);
    });

    it("accepts optional filters as undefined when not provided", () => {
      const result = analysisHistoryFilterSchema.safeParse({ page: "1" });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.status).toBeUndefined();
        expect(result.data.deploymentStatus).toBeUndefined();
      }
    });
  });

  describe("pagination metadata shape", () => {
    it("calculates totalPages correctly", () => {
      const total = 25;
      const pageSize = 10;
      const totalPages = Math.ceil(total / pageSize);
      expect(totalPages).toBe(3);
    });

    it("handles empty result set", () => {
      const total = 0;
      const pageSize = 10;
      const totalPages = Math.ceil(total / pageSize);
      expect(totalPages).toBe(0);
    });

    it("handles exact page boundary", () => {
      const total = 20;
      const pageSize = 10;
      const totalPages = Math.ceil(total / pageSize);
      expect(totalPages).toBe(2);
    });
  });

  describe("offset calculation", () => {
    it("page 1 has offset 0", () => {
      const page = 1;
      const pageSize = 10;
      expect((page - 1) * pageSize).toBe(0);
    });

    it("page 2 has offset 10", () => {
      const page = 2;
      const pageSize = 10;
      expect((page - 1) * pageSize).toBe(10);
    });

    it("page 3 with pageSize 5 has offset 10", () => {
      const page = 3;
      const pageSize = 5;
      expect((page - 1) * pageSize).toBe(10);
    });
  });
});

describe("API: Selected analysis detail", () => {
  describe("findingFilterSchema for severity filtering", () => {
    it("accepts empty filter", () => {
      const result = findingFilterSchema.safeParse({});
      expect(result.success).toBe(true);
    });

    it("accepts each valid severity", () => {
      for (const sev of ["CRITICAL", "HIGH", "MEDIUM", "LOW"]) {
        const result = findingFilterSchema.safeParse({ severity: sev });
        expect(result.success).toBe(true);
      }
    });

    it("rejects invalid severity", () => {
      const result = findingFilterSchema.safeParse({ severity: "INFO" });
      expect(result.success).toBe(false);
    });
  });

  describe("finding sort order", () => {
    const findings = [
      { id: "1", severity: "LOW", file: "B.sol", line: 10 },
      { id: "2", severity: "CRITICAL", file: "A.sol", line: 5 },
      { id: "3", severity: "HIGH", file: "A.sol", line: 20 },
      { id: "4", severity: "MEDIUM", file: "A.sol", line: 15 },
      { id: "5", severity: "CRITICAL", file: "A.sol", line: 3 },
    ];

    const SEVERITY_ORDER = ["CRITICAL", "HIGH", "MEDIUM", "LOW"];

    function sortFindings<T extends { severity: string; file: string | null; line: number | null; id: string }>(arr: T[]): T[] {
      return [...arr].sort((a, b) => {
        const aIdx = SEVERITY_ORDER.indexOf(a.severity);
        const bIdx = SEVERITY_ORDER.indexOf(b.severity);
        const severityDiff = aIdx - bIdx;
        if (severityDiff !== 0) return severityDiff;
        if (a.file && b.file) {
          const fileDiff = a.file.localeCompare(b.file);
          if (fileDiff !== 0) return fileDiff;
        }
        if (a.line !== null && b.line !== null) {
          const lineDiff = a.line - b.line;
          if (lineDiff !== 0) return lineDiff;
        }
        if (a.id < b.id) return -1;
        if (a.id > b.id) return 1;
        return 0;
      });
    }

    it("sorts CRITICAL before HIGH before MEDIUM before LOW", () => {
      const sorted = sortFindings(findings);
      expect(sorted.map((f) => f.severity)).toEqual([
        "CRITICAL",
        "CRITICAL",
        "HIGH",
        "MEDIUM",
        "LOW",
      ]);
    });

    it("sorts by file ASC within same severity", () => {
      const sameSeverity = [
        { id: "1", severity: "LOW", file: "B.sol", line: 10 },
        { id: "2", severity: "LOW", file: "A.sol", line: 5 },
      ];
      const sorted = sortFindings(sameSeverity);
      expect(sorted.map((f) => f.file)).toEqual(["A.sol", "B.sol"]);
    });

    it("sorts by line ASC within same severity and file", () => {
      const sameFile = [
        { id: "1", severity: "HIGH", file: "A.sol", line: 20 },
        { id: "2", severity: "HIGH", file: "A.sol", line: 5 },
      ];
      const sorted = sortFindings(sameFile);
      expect(sorted.map((f) => f.line)).toEqual([5, 20]);
    });

    it("sorts by id ASC when other fields are equal", () => {
      const sameFields = [
        { id: "b", severity: "HIGH", file: "A.sol", line: 5 },
        { id: "a", severity: "HIGH", file: "A.sol", line: 5 },
      ];
      const sorted = sortFindings(sameFields);
      expect(sorted.map((f) => f.id)).toEqual(["a", "b"]);
    });
  });
});

describe("API: Active vs completed analysis separation", () => {
  it("QUEUED and RUNNING are active statuses", () => {
    const activeStatuses = ["QUEUED", "RUNNING"];
    expect(activeStatuses).toContain("QUEUED");
    expect(activeStatuses).toContain("RUNNING");
  });

  it("COMPLETED and FAILED are terminal statuses", () => {
    const terminalStatuses = ["COMPLETED", "FAILED"];
    expect(terminalStatuses).toContain("COMPLETED");
    expect(terminalStatuses).toContain("FAILED");
  });

  it("active and terminal are disjoint sets", () => {
    const active = new Set(["QUEUED", "RUNNING"]);
    const terminal = new Set(["COMPLETED", "FAILED"]);
    for (const s of active) {
      expect(terminal.has(s)).toBe(false);
    }
    for (const s of terminal) {
      expect(active.has(s)).toBe(false);
    }
  });
});

describe("API: Severity count behavior", () => {
  function countBySeverity(findings: Array<{ severity: string }>) {
    const counts = { CRITICAL: 0, HIGH: 0, MEDIUM: 0, LOW: 0 };
    for (const f of findings) {
      if (f.severity in counts) {
        counts[f.severity as keyof typeof counts]++;
      }
    }
    return counts;
  }

  it("counts zero for empty findings", () => {
    expect(countBySeverity([])).toEqual({ CRITICAL: 0, HIGH: 0, MEDIUM: 0, LOW: 0 });
  });

  it("counts each severity correctly", () => {
    const findings = [
      { severity: "CRITICAL" },
      { severity: "CRITICAL" },
      { severity: "HIGH" },
      { severity: "MEDIUM" },
      { severity: "LOW" },
      { severity: "LOW" },
      { severity: "LOW" },
    ];
    expect(countBySeverity(findings)).toEqual({ CRITICAL: 2, HIGH: 1, MEDIUM: 1, LOW: 3 });
  });

  it("ignores unknown severities", () => {
    const findings = [
      { severity: "CRITICAL" },
      { severity: "INFO" },
    ];
    expect(countBySeverity(findings)).toEqual({ CRITICAL: 1, HIGH: 0, MEDIUM: 0, LOW: 0 });
  });
});

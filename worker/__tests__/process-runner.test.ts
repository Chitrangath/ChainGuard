import { describe, expect, it } from "vitest";
import { spawn } from "node:child_process";
import * as fs from "node:fs";
import * as path from "node:path";
import { runBoundedProcess } from "../process-runner";

describe("runBoundedProcess", () => {
  it("bounds stdout independently and terminates only its child group", async () => {
    const result = await runBoundedProcess(process.execPath, ["-e", "process.stdout.write('x'.repeat(10000))"], { timeoutMs: 1000, maxStdoutBytes: 100 });
    expect(result.reasonCode).toBe("OUTPUT_LIMIT");
    expect(result.stdout.length).toBeLessThanOrEqual(100);
  });

  it("bounds stderr independently", async () => {
    const result = await runBoundedProcess(process.execPath, ["-e", "process.stderr.write('x'.repeat(10000))"], { timeoutMs: 1000, maxStderrBytes: 100 });
    expect(result.reasonCode).toBe("OUTPUT_LIMIT");
    expect(result.stderr).toBe("OUTPUT_LIMIT");
  });

  it("deterministically cancels a hung owned process", async () => {
    const controller = new AbortController();
    const pending = runBoundedProcess(process.execPath, ["-e", "setInterval(()=>{}, 1000)"], { timeoutMs: 5000, signal: controller.signal });
    controller.abort();
    expect((await pending).reasonCode).toBe("ABORTED");
  });

  it("times out its process group without killing an unrelated process", async () => {
    const unrelated = spawn(process.execPath, ["-e", "setInterval(()=>{}, 1000)"], { detached: true });
    try {
      const result = await runBoundedProcess(process.execPath, ["-e", "setInterval(()=>{}, 1000)"], { timeoutMs: 50 });
      expect(result.reasonCode).toBe("TIMEOUT");
      expect(unrelated.exitCode).toBeNull();
    } finally {
      try { process.kill(-unrelated.pid!, "SIGKILL"); } catch { unrelated.kill("SIGKILL"); }
    }
  });

  it("terminates a child when its owned workspace exceeds the byte limit", async () => {
    const workspace = fs.mkdtempSync("/tmp/chainguard-process-budget-");
    try {
      const output = path.join(workspace, "large.bin");
      const result = await runBoundedProcess(process.execPath, ["-e", `require('fs').writeFileSync(${JSON.stringify(output)}, Buffer.alloc(4096)); setInterval(()=>{}, 1000)`], {
        timeoutMs: 2_000,
        workspace: { path: workspace, maxBytes: 1_024, maxEntries: 100, pollIntervalMs: 10 },
      });
      expect(result.reasonCode).toBe("WORKSPACE_LIMIT");
    } finally {
      fs.rmSync(workspace, { recursive: true, force: true });
    }
  });
});

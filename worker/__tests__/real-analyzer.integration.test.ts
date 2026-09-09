import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { describe, expect, it } from "vitest";
import { classifySlitherResult } from "../../src/lib/analysis-parser";

const run = promisify(execFile);
const real = process.env.RUN_REAL_ANALYZER === "1" ? describe : describe.skip;

async function analyzerStdout(command: string): Promise<string> {
  const { stdout } = await run("docker", [
    "run", "--rm", "--network", "none", "--read-only", "--cap-drop=ALL",
    "--security-opt=no-new-privileges", "--memory=256m", "--cpus=1",
    "--pids-limit=64", "--tmpfs", "/tmp:rw,nosuid,nodev,size=16m",
    "chainguard-analyzer:latest", "sh", "-c", command,
  ], { timeout: 30_000 });
  return stdout;
}

real("real analyzer failure evidence", () => {
  it("classifies missing analyzer JSON as failed and unscorable", async () => {
    const raw = await analyzerStdout("true");
    const result = classifySlitherResult(raw, 1, "", 1);
    expect(result).toMatchObject({ status: "FAIL", reasonCode: "EMPTY_OUTPUT" });
  });

  it("classifies malformed analyzer JSON as failed and unscorable", async () => {
    const raw = await analyzerStdout("printf '{'");
    const result = classifySlitherResult(raw, 1, "", 1);
    expect(result).toMatchObject({ status: "FAIL", reasonCode: "INVALID_OUTPUT" });
  });
});

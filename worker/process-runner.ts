import { spawn } from "node:child_process";

export const MAX_STDOUT_BYTES = 1024 * 1024;
export const MAX_STDERR_BYTES = 1024 * 1024;

export interface ProcessResult {
  exitCode: number;
  stdout: string;
  stderr: string;
  reasonCode?: "TIMEOUT" | "OUTPUT_LIMIT" | "ABORTED" | "SPAWN_FAILED";
}

export function runBoundedProcess(cmd: string, args: string[], options: {
  cwd?: string; timeoutMs: number; signal?: AbortSignal; stdin?: string;
  maxStdoutBytes?: number; maxStderrBytes?: number;
}): Promise<ProcessResult> {
  return new Promise((resolve) => {
    const child = spawn(cmd, args, { cwd: options.cwd, detached: process.platform !== "win32", shell: false, stdio: ["pipe", "pipe", "pipe"] });
    let stdout = Buffer.alloc(0);
    let stderr = Buffer.alloc(0);
    let reasonCode: ProcessResult["reasonCode"];
    let settled = false;
    const terminate = (reason: ProcessResult["reasonCode"]) => {
      if (reasonCode) return;
      reasonCode = reason;
      try { process.platform === "win32" ? child.kill("SIGKILL") : process.kill(-child.pid!, "SIGKILL"); } catch { child.kill("SIGKILL"); }
    };
    const timer = setTimeout(() => terminate("TIMEOUT"), options.timeoutMs);
    const abort = () => terminate("ABORTED");
    options.signal?.addEventListener("abort", abort, { once: true });
    if (options.signal?.aborted) abort();
    child.stdout.on("data", (chunk: Buffer) => {
      if (stdout.length + chunk.length > (options.maxStdoutBytes ?? MAX_STDOUT_BYTES)) return terminate("OUTPUT_LIMIT");
      stdout = Buffer.concat([stdout, chunk]);
    });
    child.stderr.on("data", (chunk: Buffer) => {
      if (stderr.length + chunk.length > (options.maxStderrBytes ?? MAX_STDERR_BYTES)) return terminate("OUTPUT_LIMIT");
      stderr = Buffer.concat([stderr, chunk]);
    });
    child.on("error", () => { reasonCode ??= "SPAWN_FAILED"; });
    child.on("close", (code) => {
      if (settled) return;
      settled = true; clearTimeout(timer); options.signal?.removeEventListener("abort", abort);
      resolve({ exitCode: reasonCode ? -1 : (code ?? 1), stdout: stdout.toString(), stderr: reasonCode ?? stderr.toString(), reasonCode });
    });
    if (options.stdin !== undefined) child.stdin.end(options.stdin); else child.stdin.end();
  });
}

import { createClient, type RedisClientType } from "redis";

const CONNECTION_TIMEOUT_MS = 3_000;
const COMMAND_TIMEOUT_MS = 2_000;

let client: RedisClientType | null = null;
let connecting = false;
let connectPromise: Promise<RedisClientType | null> | null = null;

function log(msg: string) {
  console.log(`[redis] ${msg}`);
}

function getRedisUrl(): string | null {
  const url = process.env.REDIS_URL;
  if (!url || url.trim() === "") return null;
  return url;
}

async function connectWithTimeout(
  c: RedisClientType,
  timeoutMs: number,
): Promise<boolean> {
  const timeout = new Promise<false>((resolve) => {
    setTimeout(() => resolve(false), timeoutMs);
  });

  const connect = (async () => {
    try {
      await c.connect();
      return true;
    } catch {
      return false;
    }
  })();

  return Promise.race([connect, timeout]);
}

export async function getRedisClient(): Promise<RedisClientType | null> {
  if (client?.isReady) return client;

  const url = getRedisUrl();
  if (!url) return null;

  if (connecting && connectPromise) {
    return connectPromise;
  }

  connecting = true;
  connectPromise = (async () => {
    try {
      const c = createClient({ url });

      c.on("error", (err) => {
        log(`error: ${err.message}`);
      });

      c.on("ready", () => {
        log("connected");
      });

      c.on("disconnected", () => {
        log("disconnected");
      });

      const ok = await connectWithTimeout(c, CONNECTION_TIMEOUT_MS);
      if (!ok) {
        log("connection timed out");
        try {
          c.destroy();
        } catch {
          // best effort
        }
        client = null;
        return null;
      }

      client = c;
      return c;
    } catch (err) {
      log(`connection failed: ${err instanceof Error ? err.message : String(err)}`);
      client = null;
      return null;
    } finally {
      connecting = false;
    }
  })();

  return connectPromise;
}

export async function isRedisAvailable(): Promise<boolean> {
  const c = await getRedisClient();
  return c?.isReady ?? false;
}

export async function closeRedis(): Promise<void> {
  if (client) {
    try {
      client.destroy();
    } catch {
      // best effort
    }
    client = null;
  }
  connecting = false;
  connectPromise = null;
}

export { COMMAND_TIMEOUT_MS };

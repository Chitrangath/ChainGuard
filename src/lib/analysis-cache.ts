import { z } from "zod";
import { getRedisClient } from "./redis";

const CACHE_TTL_SECONDS = 300;
const CACHE_VERSION = 4;
const KEY_PREFIX = "analysis:";

const FindingSchema = z.object({
  id: z.string(),
  severity: z.string(),
  type: z.string(),
  contract: z.string().nullable(),
  file: z.string().nullable(),
  line: z.number().nullable(),
  description: z.string(),
  source: z.string(),
  scope: z.string(),
});

const AnalysisEnvelopeSchema = z.object({
  version: z.literal(CACHE_VERSION),
  cachedAt: z.string(),
  analysis: z.object({
    id: z.string(),
    projectId: z.string(),
    status: z.string(),
    riskScore: z.number().nullable(),
    deploymentStatus: z.string().nullable(),
    compilationStatus: z.string().nullable(),
    testStatus: z.string().nullable(),
    totalTests: z.number().nullable(),
    passedTests: z.number().nullable(),
    failedTests: z.number().nullable(),
    startedAt: z.string().nullable(),
    completedAt: z.string().nullable(),
    createdAt: z.string(),
    findings: z.array(FindingSchema),
    projectType: z.string().nullable().optional(),
    compilerVersion: z.string().nullable().optional(),
    contractsDiscovered: z.number().nullable().optional(),
    contractsCompiled: z.number().nullable().optional(),
    contractsTargetedForScan: z.number().nullable().optional(),
    securityAnalysisStatus: z.string().nullable().optional(),
    gateReasons: z.array(z.string()).optional(),
    coverage: z.string().nullable().optional(),
    evidenceVersion: z.number().nullable(),
    evidenceStatus: z.enum(["VERIFIED", "LEGACY_UNVERIFIED"]),
    firstPartySourcesDiscovered: z.number().nullable().optional(),
    dependencySourcesDiscovered: z.number().nullable().optional(),
    generatedSourcesDiscovered: z.number().nullable().optional(),
    firstPartySourcesTargeted: z.number().nullable().optional(),
    filesScanned: z.number().nullable().optional(),
    sourcesRejected: z.number().nullable().optional(),
    discoveryReasons: z.array(z.string()).optional(),
    failureReason: z.string().nullable().optional(),
  }),
});

export type AnalysisEnvelope = z.infer<typeof AnalysisEnvelopeSchema>;
export type CachedAnalysis = AnalysisEnvelope["analysis"];

export function buildCacheKey(analysisId: string): string {
  return `${KEY_PREFIX}${analysisId}`;
}

export function isTerminal(status: string): boolean {
  return status === "COMPLETED" || status === "FAILED";
}

export function createEnvelope(data: CachedAnalysis): AnalysisEnvelope {
  return {
    version: CACHE_VERSION,
    cachedAt: new Date().toISOString(),
    analysis: data,
  };
}

export function parseEnvelope(raw: string): AnalysisEnvelope | null {
  try {
    const parsed = JSON.parse(raw);
    const result = AnalysisEnvelopeSchema.safeParse(parsed);
    if (!result.success) return null;
    return result.data;
  } catch {
    return null;
  }
}

export async function getCachedAnalysis(
  analysisId: string,
): Promise<CachedAnalysis | null> {
  const client = await getRedisClient();
  if (!client?.isReady) return null;

  try {
    const raw = await client.get(buildCacheKey(analysisId));
    if (!raw) return null;

    const envelope = parseEnvelope(raw);
    if (!envelope) {
      try {
        await client.del(buildCacheKey(analysisId));
      } catch {
        // ignore
      }
      return null;
    }

    return envelope.analysis;
  } catch {
    return null;
  }
}

export async function setCachedAnalysis(
  analysisId: string,
  data: CachedAnalysis,
): Promise<void> {
  const client = await getRedisClient();
  if (!client?.isReady) return;

  try {
    const envelope = createEnvelope(data);
    await client.set(buildCacheKey(analysisId), JSON.stringify(envelope), {
      EX: CACHE_TTL_SECONDS,
    });
  } catch {
    // Best-effort — cache write failure does not fail the request
  }
}

export async function deleteCachedAnalysis(
  analysisId: string,
): Promise<void> {
  const client = await getRedisClient();
  if (!client?.isReady) return;

  try {
    await client.del(buildCacheKey(analysisId));
  } catch {
    // best effort
  }
}

export { CACHE_TTL_SECONDS, CACHE_VERSION, KEY_PREFIX };

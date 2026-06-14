/**
 * Token-bucket rate limiter.
 *
 * Redis varsa (REDIS_URL set) → Redis INCR ile sabit-pencere sayacı kullanır.
 * Redis yoksa → bellek-içi token bucket'a (Map) döner.
 *
 * Redis algoritması: her dakika için ayrı key ("rl:{key}:{minute}").
 * INCR → ilk çağrıda EXPIRE 120 sn. Pencere sonunda key otomatik silinir.
 */

import { getRedis } from "@/lib/redis";

// ── In-memory fallback ────────────────────────────────────────────────────────

type Bucket = { tokens: number; lastRefill: number };
const buckets = new Map<string, Bucket>();

function checkInMemory(
  key: string,
  capacity: number,
  refillPerSecond: number
): { ok: true } | { ok: false; retryAfterMs: number } {
  const now = Date.now();
  const bucket = buckets.get(key) ?? { tokens: capacity, lastRefill: now };

  const elapsed = (now - bucket.lastRefill) / 1000;
  bucket.tokens = Math.min(capacity, bucket.tokens + elapsed * refillPerSecond);
  bucket.lastRefill = now;

  if (bucket.tokens >= 1) {
    bucket.tokens -= 1;
    buckets.set(key, bucket);
    return { ok: true };
  }

  buckets.set(key, bucket);
  const need = 1 - bucket.tokens;
  return { ok: false, retryAfterMs: Math.ceil((need / refillPerSecond) * 1000) };
}

// ── Redis fixed-window ────────────────────────────────────────────────────────

async function checkRedis(
  key: string,
  capacity: number
): Promise<{ ok: true } | { ok: false; retryAfterMs: number }> {
  const redis = getRedis();
  if (!redis) return checkInMemory(key, capacity, capacity / 60);

  try {
    const minute = Math.floor(Date.now() / 60_000);
    const redisKey = `rl:${key}:${minute}`;

    const count = await redis.incr(redisKey);
    if (count === 1) {
      // İlk istek — pencere başlıyor; 2 dk sonra key otomatik silinsin.
      await redis.expire(redisKey, 120);
    }

    if (count <= capacity) return { ok: true };

    const msUntilNextWindow = 60_000 - (Date.now() % 60_000);
    return { ok: false, retryAfterMs: msUntilNextWindow };
  } catch (err) {
    // Redis hatası → in-memory fallback.
    console.warn("[rate-limit] Redis hatası, bellek fallback:", (err as Error).message);
    return checkInMemory(key, capacity, capacity / 60);
  }
}

// ── Public API ────────────────────────────────────────────────────────────────

export interface RateLimitOptions {
  capacity: number;
  refillPerSecond: number;
}

/**
 * Sync (in-memory only) — eski çağrılarla geriye dönük uyumluluk için korundu.
 * Yeni kod `checkRateLimitAsync` kullanmalı.
 */
export function checkRateLimit(
  key: string,
  opts: RateLimitOptions = { capacity: 30, refillPerSecond: 30 / 60 }
): { ok: true } | { ok: false; retryAfterMs: number } {
  return checkInMemory(key, opts.capacity, opts.refillPerSecond);
}

/** Async — Redis'i kullanır, yoksa in-memory'e döner. */
export async function checkRateLimitAsync(
  key: string,
  capacity: number
): Promise<{ ok: true } | { ok: false; retryAfterMs: number }> {
  return checkRedis(key, capacity);
}

export async function llmRateLimitFor(
  toolSlug: string
): Promise<{ ok: true } | { ok: false; retryAfterMs: number }> {
  const perMin = Number(process.env.LLM_RATE_LIMIT_PER_MIN ?? 30);
  return checkRateLimitAsync(`llm:${toolSlug}`, perMin);
}

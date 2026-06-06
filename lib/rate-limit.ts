// Basit, bellek-içi token bucket. MVP yeterli — production'da Redis'e taşınmalı.
type Bucket = { tokens: number; lastRefill: number };

const buckets = new Map<string, Bucket>();

export interface RateLimitOptions {
  capacity: number;
  refillPerSecond: number;
}

export function checkRateLimit(
  key: string,
  opts: RateLimitOptions = { capacity: 30, refillPerSecond: 30 / 60 }
): { ok: true } | { ok: false; retryAfterMs: number } {
  const now = Date.now();
  const bucket = buckets.get(key) ?? { tokens: opts.capacity, lastRefill: now };

  const elapsed = (now - bucket.lastRefill) / 1000;
  bucket.tokens = Math.min(opts.capacity, bucket.tokens + elapsed * opts.refillPerSecond);
  bucket.lastRefill = now;

  if (bucket.tokens >= 1) {
    bucket.tokens -= 1;
    buckets.set(key, bucket);
    return { ok: true };
  }

  buckets.set(key, bucket);
  const need = 1 - bucket.tokens;
  const retryAfterMs = Math.ceil((need / opts.refillPerSecond) * 1000);
  return { ok: false, retryAfterMs };
}

export function llmRateLimitFor(toolSlug: string) {
  const perMin = Number(process.env.LLM_RATE_LIMIT_PER_MIN ?? 30);
  return checkRateLimit(`llm:${toolSlug}`, { capacity: perMin, refillPerSecond: perMin / 60 });
}

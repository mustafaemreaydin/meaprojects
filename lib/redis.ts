/**
 * Redis istemci singleton.
 *
 * REDIS_URL ortam değişkeni yoksa `null` döner — rate limit otomatik
 * olarak bellek-içi fallback'e geçer. Production'da Redis zorunlu değil
 * ama tavsiye edilir (çok process / restart'ta kota sıfırlanmaz).
 *
 * Bağlantı hataları sessizce loglanır ve fallback tetiklenir.
 */

import Redis from "ioredis";

declare global {
  // Next.js dev hot-reload'da yeni bağlantı açmamak için global cache.
  // eslint-disable-next-line no-var
  var __redis: Redis | null | undefined;
}

function createRedisClient(): Redis | null {
  const url = process.env.REDIS_URL;
  if (!url) return null;

  const client = new Redis(url, {
    maxRetriesPerRequest: 1,
    enableReadyCheck: false,
    lazyConnect: true,
  });

  client.on("error", (err: Error) => {
    // Bağlantı hatası gelirse uyar ama süreci çökertme.
    console.error("[redis] Bağlantı hatası:", err.message);
  });

  return client;
}

export function getRedis(): Redis | null {
  if (process.env.NODE_ENV === "production") {
    // Production'da her modül yüklemesinde tek örnek (global cache yok).
    if (global.__redis === undefined) {
      global.__redis = createRedisClient();
    }
    return global.__redis ?? null;
  }

  // Development: hot-reload'a karşı global cache.
  if (!global.__redis) {
    global.__redis = createRedisClient();
  }
  return global.__redis;
}

import { prisma } from "@/lib/db";
import { llmComplete } from "@/lib/llm";

export interface JobContext {
  meaprojects: {
    llm: { complete: (args: unknown) => Promise<unknown> };
    storage: {
      get: (key: string) => Promise<unknown>;
      set: (key: string, value: unknown) => Promise<{ ok: boolean }>;
      delete: (key: string) => Promise<{ ok: boolean }>;
      list: (prefix?: string) => Promise<string[]>;
    };
    notify: (message: string, data?: unknown) => Promise<void>;
    context: { toolSlug: string };
  };
  console: { log: (...a: unknown[]) => void; error: (...a: unknown[]) => void; warn: (...a: unknown[]) => void };
  fetch: typeof globalThis.fetch;
}

export function buildJobContext(toolId: string, toolSlug: string): {
  ctx: JobContext;
  getLogs: () => string[];
} {
  const logs: string[] = [];
  const log = (...args: unknown[]) => {
    logs.push(args.map((a) => (typeof a === "object" ? JSON.stringify(a) : String(a))).join(" "));
  };

  const ctx: JobContext = {
    meaprojects: {
      llm: {
        complete: async (args: unknown) => {
          const a = args as { model: string; messages: Array<{ role: "system" | "user" | "assistant"; content: string }>; maxTokens?: number; temperature?: number; system?: string };
          return llmComplete({ ...a, provider: "openrouter" });
        },
      },
      storage: {
        get: async (key: string) => {
          const row = await prisma.toolStorage.findUnique({ where: { toolId_key: { toolId, key } } });
          if (!row) return null;
          try { return JSON.parse(row.value); } catch { return null; }
        },
        set: async (key: string, value: unknown) => {
          const v = JSON.stringify(value ?? null);
          await prisma.toolStorage.upsert({
            where: { toolId_key: { toolId, key } },
            create: { toolId, key, value: v },
            update: { value: v },
          });
          return { ok: true };
        },
        delete: async (key: string) => {
          await prisma.toolStorage.delete({ where: { toolId_key: { toolId, key } } }).catch(() => undefined);
          return { ok: true };
        },
        list: async (prefix = "") => {
          const rows = await prisma.toolStorage.findMany({
            where: { toolId, key: { startsWith: prefix } },
            orderBy: { key: "asc" },
          });
          return rows.map((r) => r.key);
        },
      },
      notify: async (message: string, data?: unknown) => {
        await prisma.toolNotification.create({
          data: { toolSlug, message, data: data !== undefined ? JSON.stringify(data) : null },
        });
      },
      context: { toolSlug },
    },
    console: { log, error: log, warn: log },
    fetch: globalThis.fetch,
  };

  return { ctx, getLogs: () => [...logs] };
}

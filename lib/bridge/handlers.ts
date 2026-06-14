import { prisma } from "@/lib/db";
import { hasPermission } from "@/lib/permissions";

export async function resolveToolBySlug(slug: string) {
  const tool = await prisma.tool.findUnique({ where: { slug } });
  if (!tool) throw new Error(`Tool bulunamadı: ${slug}`);
  if (tool.status !== "installed") {
    throw new Error(`Tool aktif değil (status: ${tool.status}).`);
  }
  const permissions = safeArray(tool.permissions);
  return { tool, permissions };
}

function safeArray(s: string): string[] {
  try {
    const v = JSON.parse(s);
    return Array.isArray(v) ? v.map(String) : [];
  } catch {
    return [];
  }
}

export async function handleStorageGet(slug: string, key: string) {
  const { tool, permissions } = await resolveToolBySlug(slug);
  if (!hasPermission(permissions, "storage:local")) {
    throw new Error("Bu tool 'storage:local' iznine sahip değil.");
  }
  const row = await prisma.toolStorage.findUnique({
    where: { toolId_key: { toolId: tool.id, key } },
  });
  if (!row) return null;
  try {
    return JSON.parse(row.value);
  } catch {
    return null;
  }
}

export async function handleStorageSet(slug: string, key: string, value: unknown) {
  const { tool, permissions } = await resolveToolBySlug(slug);
  if (!hasPermission(permissions, "storage:local")) {
    throw new Error("Bu tool 'storage:local' iznine sahip değil.");
  }
  const valueStr = JSON.stringify(value ?? null);
  await prisma.toolStorage.upsert({
    where: { toolId_key: { toolId: tool.id, key } },
    create: { toolId: tool.id, key, value: valueStr },
    update: { value: valueStr },
  });
  return { ok: true };
}

export async function handleStorageDelete(slug: string, key: string) {
  const { tool, permissions } = await resolveToolBySlug(slug);
  if (!hasPermission(permissions, "storage:local")) {
    throw new Error("Bu tool 'storage:local' iznine sahip değil.");
  }
  await prisma.toolStorage
    .delete({ where: { toolId_key: { toolId: tool.id, key } } })
    .catch(() => undefined);
  return { ok: true };
}

export async function handleStorageList(slug: string, prefix: string) {
  const { tool, permissions } = await resolveToolBySlug(slug);
  if (!hasPermission(permissions, "storage:local")) {
    throw new Error("Bu tool 'storage:local' iznine sahip değil.");
  }
  const rows = await prisma.toolStorage.findMany({
    where: { toolId: tool.id, key: { startsWith: prefix } },
    orderBy: { key: "asc" },
  });
  return rows.map((r) => r.key);
}

export async function handleStorageGetAll(slug: string, prefix: string) {
  const { tool, permissions } = await resolveToolBySlug(slug);
  if (!hasPermission(permissions, "storage:local")) {
    throw new Error("Bu tool 'storage:local' iznine sahip değil.");
  }
  const rows = await prisma.toolStorage.findMany({
    where: { toolId: tool.id, key: { startsWith: prefix } },
    orderBy: { key: "asc" },
  });
  return Object.fromEntries(
    rows.map((r) => {
      try {
        return [r.key, JSON.parse(r.value)];
      } catch {
        return [r.key, null];
      }
    })
  );
}

import path from "node:path";
import fs from "node:fs/promises";
import { prisma } from "@/lib/db";
import { extractZipSafely } from "./zip";
import { parseManifest, type Manifest } from "./manifest";
import { ensureDir, removeDir, toolDir, TOOLS_DIR } from "./paths";

export interface InstallResult {
  manifest: Manifest;
  toolId: string;
  updated: boolean;
}

/**
 * Bir zip buffer'ından yeni tool kurar veya mevcut slug için günceller.
 *
 * NOTE: backend tool'lar için subprocess spawn / port atama henüz devrede değil.
 * TODO(v2): type === "backend" ise virtualenv/npm install + spawn + healthcheck.
 */
export async function installToolFromZip(zipBuffer: Buffer): Promise<InstallResult> {
  // Stage inside TOOLS_DIR so the final rename is same-filesystem (avoids EXDEV
  // when /app/tools is a mounted volume but /app/data is the container overlay).
  await ensureDir(TOOLS_DIR);
  const stagingDir = path.join(TOOLS_DIR, `.staging-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`);

  try {
    const { manifestRaw } = await extractZipSafely(zipBuffer, stagingDir);
    const manifest = parseManifest(manifestRaw);

    // Entry dosyası gerçekten var mı?
    const entryAbs = path.join(stagingDir, manifest.entry);
    try {
      await fs.access(entryAbs);
    } catch {
      throw new Error(`Manifest'te belirtilen entry dosyası bulunamadı: ${manifest.entry}`);
    }

    const existing = await prisma.tool.findUnique({ where: { slug: manifest.slug } });
    const finalDir = toolDir(manifest.slug);

    // Mevcut klasörü temizle, staging'i taşı.
    await removeDir(finalDir);
    await ensureDir(path.dirname(finalDir));
    await fs.rename(stagingDir, finalDir);

    const data = {
      slug: manifest.slug,
      name: manifest.name,
      version: manifest.version,
      description: manifest.description ?? null,
      icon: manifest.icon ?? null,
      type: manifest.type,
      manifest: JSON.stringify(manifest),
      permissions: JSON.stringify(manifest.permissions ?? []),
      status: "installed",
    };

    if (existing) {
      const tool = await prisma.tool.update({ where: { slug: manifest.slug }, data });
      return { manifest, toolId: tool.id, updated: true };
    }
    const tool = await prisma.tool.create({ data });
    return { manifest, toolId: tool.id, updated: false };
  } catch (err) {
    await removeDir(stagingDir).catch(() => {});
    throw err;
  }
}

export async function uninstallTool(slug: string): Promise<void> {
  const tool = await prisma.tool.findUnique({ where: { slug } });
  if (!tool) return;
  await prisma.tool.delete({ where: { slug } });
  await removeDir(toolDir(slug));
}

export async function setToolStatus(
  slug: string,
  status: "installed" | "disabled" | "error"
): Promise<void> {
  await prisma.tool.update({ where: { slug }, data: { status } });
}

export interface ToolListItem {
  id: string;
  slug: string;
  name: string;
  version: string;
  description: string | null;
  icon: string | null;
  type: string;
  status: string;
  permissions: string[];
  installedAt: Date;
  updatedAt: Date;
}

export async function listTools(): Promise<ToolListItem[]> {
  const rows = await prisma.tool.findMany({ orderBy: { updatedAt: "desc" } });
  return rows.map((r) => ({
    id: r.id,
    slug: r.slug,
    name: r.name,
    version: r.version,
    description: r.description,
    icon: r.icon,
    type: r.type,
    status: r.status,
    permissions: safeParseJSONArray(r.permissions),
    installedAt: r.installedAt,
    updatedAt: r.updatedAt,
  }));
}

function safeParseJSONArray(s: string): string[] {
  try {
    const v = JSON.parse(s);
    return Array.isArray(v) ? v.map(String) : [];
  } catch {
    return [];
  }
}

import path from "node:path";
import fs from "node:fs/promises";

// İknaLab projesinin kökü (cwd).
export const PROJECT_ROOT = process.cwd();
export const TOOLS_DIR = path.join(PROJECT_ROOT, "tools");
export const DATA_DIR = path.join(PROJECT_ROOT, "data");
export const TMP_DIR = path.join(DATA_DIR, "tmp");

export function toolDir(slug: string): string {
  return path.join(TOOLS_DIR, slug);
}

export async function ensureDir(dir: string): Promise<void> {
  await fs.mkdir(dir, { recursive: true });
}

export async function removeDir(dir: string): Promise<void> {
  await fs.rm(dir, { recursive: true, force: true });
}

// path traversal koruması: target, base'in altında olmalı.
export function assertInside(base: string, target: string): void {
  const resolvedBase = path.resolve(base) + path.sep;
  const resolvedTarget = path.resolve(target);
  if (!(resolvedTarget + path.sep).startsWith(resolvedBase) && resolvedTarget !== path.resolve(base)) {
    throw new Error(`Yol güvenlik dışı: ${target}`);
  }
}

import path from "node:path";
import fs from "node:fs/promises";
import AdmZip from "adm-zip";
import { assertInside, ensureDir } from "./paths";

export const MAX_ZIP_BYTES = 50 * 1024 * 1024; // 50MB

export interface ExtractResult {
  manifestRaw: unknown;
  fileCount: number;
  totalBytes: number;
}

/**
 * Zip içeriğini hedef klasöre güvenli şekilde çıkarır.
 * - "../" veya mutlak yol içeren entry reddedilir.
 * - Toplam boyut MAX_ZIP_BYTES'i aşamaz.
 * - tool.json kökte olmak zorundadır.
 */
export async function extractZipSafely(
  zipBuffer: Buffer,
  targetDir: string
): Promise<ExtractResult> {
  if (zipBuffer.byteLength > MAX_ZIP_BYTES) {
    throw new Error(
      `Zip dosyası çok büyük (${(zipBuffer.byteLength / 1024 / 1024).toFixed(1)} MB). ` +
        `Üst sınır: ${MAX_ZIP_BYTES / 1024 / 1024} MB.`
    );
  }

  const zip = new AdmZip(zipBuffer);
  const entries = zip.getEntries();

  let totalBytes = 0;
  for (const e of entries) {
    if (e.isDirectory) continue;
    totalBytes += e.header.size;
    if (totalBytes > MAX_ZIP_BYTES) {
      throw new Error("Zip içerikleri toplamı izin verilen boyutu aşıyor.");
    }
    if (e.entryName.includes("..") || path.isAbsolute(e.entryName)) {
      throw new Error(`Güvensiz yol içeren entry: ${e.entryName}`);
    }
  }

  const manifestEntry = entries.find(
    (e) => !e.isDirectory && (e.entryName === "tool.json" || e.entryName.endsWith("/tool.json"))
  );
  if (!manifestEntry) {
    throw new Error("Zip içinde tool.json bulunamadı.");
  }

  // Birçok zip aracı içeriği bir kök klasör altına sarar (örn. mytool/tool.json).
  // Manifest entry'sinin parent'ı varsa onu strip prefix olarak kullan.
  const stripPrefix = manifestEntry.entryName.includes("/")
    ? manifestEntry.entryName.slice(0, manifestEntry.entryName.lastIndexOf("/") + 1)
    : "";

  await ensureDir(targetDir);

  for (const e of entries) {
    if (e.isDirectory) continue;
    if (stripPrefix && !e.entryName.startsWith(stripPrefix)) continue;
    const relName = stripPrefix ? e.entryName.slice(stripPrefix.length) : e.entryName;
    if (!relName) continue;
    const outPath = path.join(targetDir, relName);
    assertInside(targetDir, outPath);
    await ensureDir(path.dirname(outPath));
    await fs.writeFile(outPath, e.getData());
  }

  const manifestPath = path.join(targetDir, "tool.json");
  const manifestText = await fs.readFile(manifestPath, "utf8");
  let manifestRaw: unknown;
  try {
    manifestRaw = JSON.parse(manifestText);
  } catch (err) {
    throw new Error("tool.json geçerli JSON değil: " + (err as Error).message);
  }

  return { manifestRaw, fileCount: entries.filter((e) => !e.isDirectory).length, totalBytes };
}

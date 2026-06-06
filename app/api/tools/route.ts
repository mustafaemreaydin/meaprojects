import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/access";
import { installToolFromZip } from "@/lib/tools/registry";
import { extractZipSafely } from "@/lib/tools/zip";
import { safeParseManifest } from "@/lib/tools/manifest";
import { ensureDir, removeDir, TMP_DIR } from "@/lib/tools/paths";
import path from "node:path";

export async function GET() {
  if (!(await requireAdmin())) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const tools = await prisma.tool.findMany({ orderBy: { updatedAt: "desc" } });
  return NextResponse.json(tools);
}

export async function POST(req: NextRequest) {
  if (!(await requireAdmin())) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: "Geçersiz form verisi." }, { status: 400 });
  }
  const file = form.get("file");
  const mode = (form.get("mode")?.toString() ?? "install") as "preview" | "install";

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Dosya bulunamadı." }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());

  if (mode === "preview") {
    // Sadece manifest'i çıkar ve göster, kuruluma geçme.
    await ensureDir(TMP_DIR);
    const previewDir = path.join(
      TMP_DIR,
      `preview-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
    );
    try {
      const { manifestRaw } = await extractZipSafely(buffer, previewDir);
      const parsed = safeParseManifest(manifestRaw);
      if (!parsed.success) {
        return NextResponse.json(
          { error: "Manifest geçersiz: " + parsed.error.issues.map((i) => i.message).join("; ") },
          { status: 400 }
        );
      }
      const existing = await prisma.tool.findUnique({ where: { slug: parsed.data.slug } });
      return NextResponse.json({
        manifest: parsed.data,
        existingSlug: !!existing,
      });
    } catch (err) {
      return NextResponse.json({ error: (err as Error).message }, { status: 400 });
    } finally {
      await removeDir(previewDir).catch(() => {});
    }
  }

  // Kurulum
  try {
    const { manifest, updated } = await installToolFromZip(buffer);
    return NextResponse.json({ manifest, updated });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 400 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import path from "node:path";
import fs from "node:fs/promises";
import { prisma } from "@/lib/db";
import { getCurrentUser, canAccessTool } from "@/lib/access";
import { toolDir, assertInside } from "@/lib/tools/paths";
import { injectBridgeIntoHtml, type BridgeBootstrapOptions } from "@/lib/bridge/inject";

/**
 * Tool dosyalarını serve eder.
 *   /api/tools/{slug}/file/{...path}
 *
 * - index.html için `window.meaprojects` bridge script'i enjekte edilir.
 * - path traversal koruması toolDir altında kontrol edilir.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { slug: string; path: string[] } }
) {
  const user = await getCurrentUser();
  if (!user) return new NextResponse("Unauthorized", { status: 401 });

  const tool = await prisma.tool.findUnique({ where: { slug: params.slug } });
  if (!tool) return new NextResponse("Tool not found.", { status: 404 });
  if (tool.status !== "installed") return new NextResponse("Tool not active.", { status: 423 });

  // Members may only fetch files for tools they can access.
  if (!(await canAccessTool(user.id, user.role, tool))) {
    return new NextResponse("Forbidden", { status: 403 });
  }

  const base = toolDir(tool.slug);
  const subPath = (params.path ?? []).join("/");
  const target = path.resolve(base, subPath);
  try {
    assertInside(base, target);
  } catch {
    return new NextResponse("Güvensiz yol.", { status: 400 });
  }

  let buf: Buffer;
  try {
    buf = await fs.readFile(target);
  } catch {
    return new NextResponse("Dosya yok.", { status: 404 });
  }

  const ext = path.extname(target).toLowerCase();
  const type = MIME[ext] ?? "application/octet-stream";

  if (ext === ".html") {
    const html = buf.toString("utf8");
    // Parent origin = the origin this file is served from (apex OR a tool
    // subdomain). The runner page and these files always share that origin,
    // so the in-iframe bridge can postMessage to its real parent.
    const host = req.headers.get("host") ?? "localhost:3000";
    const proto =
      req.headers.get("x-forwarded-proto") ??
      (host.startsWith("localhost") || host.includes("127.0.0.1") ? "http" : "https");
    const parentOrigin = `${proto}://${host}`;
    const themeCookie = req.cookies.get("theme")?.value;
    const theme: "light" | "dark" = themeCookie === "dark" ? "dark" : "light";
    const manifestJson = safeJson<{ ui?: string }>(tool.manifest);
    const opts: BridgeBootstrapOptions = {
      toolSlug: tool.slug,
      parentOrigin,
      theme,
      locale: "tr",
      user: {
        id: user.id,
        name: user.name ?? "You",
      },
      ui: manifestJson?.ui === "mea",
    };
    const patched = injectBridgeIntoHtml(html, opts);
    return new NextResponse(patched, {
      headers: { "content-type": "text/html; charset=utf-8" },
    });
  }

  return new NextResponse(new Uint8Array(buf), { headers: { "content-type": type } });
}

function safeJson<T>(s: string): T | null {
  try { return JSON.parse(s) as T; } catch { return null; }
}

const MIME: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".htm": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".mjs": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".ico": "image/x-icon",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".ttf": "font/ttf",
  ".otf": "font/otf",
  ".map": "application/json; charset=utf-8",
  ".txt": "text/plain; charset=utf-8",
  ".md": "text/markdown; charset=utf-8",
};

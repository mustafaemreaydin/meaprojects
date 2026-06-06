import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/access";
import { setToolStatus, uninstallTool } from "@/lib/tools/registry";

export async function GET(_req: NextRequest, { params }: { params: { slug: string } }) {
  if (!(await requireAdmin())) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const tool = await prisma.tool.findUnique({ where: { slug: params.slug } });
  if (!tool) return NextResponse.json({ error: "Tool not found." }, { status: 404 });
  return NextResponse.json(tool);
}

const PatchSchema = z.object({
  status: z.enum(["installed", "disabled"]).optional(),
  access: z.enum(["private", "granted", "public"]).optional(),
});

export async function PATCH(req: NextRequest, { params }: { params: { slug: string } }) {
  if (!(await requireAdmin())) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const body = await req.json().catch(() => null);
  const parsed = PatchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid body." }, { status: 400 });
  }
  if (parsed.data.status) {
    await setToolStatus(params.slug, parsed.data.status);
  }
  if (parsed.data.access) {
    await prisma.tool.update({ where: { slug: params.slug }, data: { access: parsed.data.access } });
  }
  const tool = await prisma.tool.findUnique({ where: { slug: params.slug } });
  return NextResponse.json(tool);
}

export async function DELETE(_req: NextRequest, { params }: { params: { slug: string } }) {
  if (!(await requireAdmin())) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  await uninstallTool(params.slug);
  return NextResponse.json({ ok: true });
}

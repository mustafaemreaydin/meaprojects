import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/access";

const PatchSchema = z.object({
  password: z.string().min(6).max(200).optional(),
  name: z.string().trim().max(120).optional(),
});

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const target = await prisma.user.findUnique({ where: { id: params.id } });
  if (!target) return NextResponse.json({ error: "User not found." }, { status: 404 });
  if (target.role === "admin") {
    return NextResponse.json({ error: "Admin accounts are managed via .env." }, { status: 400 });
  }

  const body = await req.json().catch(() => null);
  const parsed = PatchSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid body." }, { status: 400 });

  const data: { password?: string; name?: string | null } = {};
  if (parsed.data.password) data.password = await bcrypt.hash(parsed.data.password, 10);
  if (parsed.data.name !== undefined) data.name = parsed.data.name || null;

  await prisma.user.update({ where: { id: params.id }, data });
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const target = await prisma.user.findUnique({ where: { id: params.id } });
  if (!target) return NextResponse.json({ error: "User not found." }, { status: 404 });
  if (target.role === "admin") {
    return NextResponse.json({ error: "Cannot delete an admin account." }, { status: 400 });
  }
  await prisma.user.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}

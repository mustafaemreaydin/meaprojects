import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/access";

const Schema = z.object({
  userId: z.string().min(1),
  toolId: z.string().min(1),
  grant: z.boolean(),
});

export async function POST(req: NextRequest) {
  if (!(await requireAdmin())) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const body = await req.json().catch(() => null);
  const parsed = Schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid body." }, { status: 400 });

  const { userId, toolId, grant } = parsed.data;

  // Don't grant access to an admin (they already have everything).
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user || user.role === "admin") {
    return NextResponse.json({ error: "Invalid target user." }, { status: 400 });
  }

  if (grant) {
    await prisma.toolAccess.upsert({
      where: { userId_toolId: { userId, toolId } },
      create: { userId, toolId },
      update: {},
    });
  } else {
    await prisma.toolAccess.deleteMany({ where: { userId, toolId } });
  }
  return NextResponse.json({ ok: true });
}

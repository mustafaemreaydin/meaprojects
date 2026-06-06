import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/access";

// Clear all contact requests.
export async function DELETE() {
  if (!(await requireAdmin())) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { count } = await prisma.contactRequest.deleteMany({});
  return NextResponse.json({ ok: true, deleted: count });
}

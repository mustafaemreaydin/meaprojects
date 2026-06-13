import { NextRequest, NextResponse } from "next/server";
import { requireToolAccess } from "@/lib/access";
import { prisma } from "@/lib/db";

export async function POST(req: NextRequest) {
  const slug = req.headers.get("x-meaprojects-tool");
  if (!slug) return NextResponse.json({ error: "Tool slug eksik." }, { status: 400 });

  const access = await requireToolAccess(slug);
  if (!access.ok) return NextResponse.json({ error: "Unauthorized" }, { status: access.status });

  const body = await req.json().catch(() => ({})) as { since?: string };
  const since = body.since ? new Date(body.since) : new Date(Date.now() - 60_000);

  const notifications = await prisma.toolNotification.findMany({
    where: { toolSlug: slug, createdAt: { gt: since }, read: false },
    orderBy: { createdAt: "asc" },
  });

  // Mark as read
  if (notifications.length > 0) {
    await prisma.toolNotification.updateMany({
      where: { id: { in: notifications.map((n) => n.id) } },
      data: { read: true },
    });
  }

  return NextResponse.json(
    notifications.map((n) => ({
      id: n.id,
      message: n.message,
      data: n.data ? JSON.parse(n.data) : undefined,
      createdAt: n.createdAt,
    }))
  );
}

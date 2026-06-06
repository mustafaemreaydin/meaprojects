import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

// Lightweight health check for Docker / uptime monitors.
// Verifies the process is up and the database is reachable.
export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return NextResponse.json({ ok: true, db: "up", time: new Date().toISOString() });
  } catch {
    return NextResponse.json({ ok: false, db: "down" }, { status: 503 });
  }
}

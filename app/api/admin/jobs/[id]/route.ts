import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/access";
import { prisma } from "@/lib/db";
import { scheduleJob, stopJob } from "@/lib/jobs/scheduler";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user || user.role !== "admin") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { op } = await req.json() as { op: string };
  const job = await prisma.toolJob.findUnique({ where: { id: params.id } });
  if (!job) return NextResponse.json({ error: "Bulunamadı." }, { status: 404 });

  if (op === "pause") {
    stopJob(job.id);
    await prisma.toolJob.update({ where: { id: job.id }, data: { status: "paused" } });
  } else if (op === "resume") {
    await prisma.toolJob.update({ where: { id: job.id }, data: { status: "active" } });
    if (job.type === "cron" && job.schedule) scheduleJob(job.id, job.schedule);
  } else if (op === "cancel") {
    stopJob(job.id);
    await prisma.toolJob.update({ where: { id: job.id }, data: { status: "cancelled" } });
  }

  return NextResponse.json({ ok: true });
}

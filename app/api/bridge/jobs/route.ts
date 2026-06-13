import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireToolAccess } from "@/lib/access";
import { resolveToolBySlug } from "@/lib/bridge/handlers";
import { hasPermission } from "@/lib/permissions";
import { prisma } from "@/lib/db";
import { scheduleJob, stopJob } from "@/lib/jobs/scheduler";

const RegisterSchema = z.object({
  op: z.literal("register"),
  name: z.string().min(1).max(80).regex(/^[a-z0-9-_]+$/i),
  type: z.enum(["cron", "once", "webhook"]),
  schedule: z.string().optional(),
  code: z.string().min(1).max(50_000),
});

const OpSchema = z.discriminatedUnion("op", [
  RegisterSchema,
  z.object({ op: z.literal("cancel"), name: z.string() }),
  z.object({ op: z.literal("pause"), name: z.string() }),
  z.object({ op: z.literal("resume"), name: z.string() }),
  z.object({ op: z.literal("list") }),
]);

export async function POST(req: NextRequest) {
  const slug = req.headers.get("x-meaprojects-tool");
  if (!slug) return NextResponse.json({ error: "Tool slug eksik." }, { status: 400 });

  const access = await requireToolAccess(slug);
  if (!access.ok) return NextResponse.json({ error: "Unauthorized" }, { status: access.status });

  const { tool, permissions } = await resolveToolBySlug(slug);
  if (!hasPermission(permissions, "jobs:write")) {
    return NextResponse.json({ error: "Bu tool 'jobs:write' iznine sahip değil." }, { status: 403 });
  }

  const json = await req.json().catch(() => null);
  const parsed = OpSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Geçersiz istek." }, { status: 400 });
  }

  const data = parsed.data;

  if (data.op === "list") {
    const jobs = await prisma.toolJob.findMany({
      where: { toolId: tool.id },
      select: { id: true, name: true, type: true, schedule: true, status: true, lastRunAt: true, nextRunAt: true, createdAt: true },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(jobs);
  }

  if (data.op === "register") {
    if ((data.type === "cron") && !data.schedule) {
      return NextResponse.json({ error: "cron tipi için schedule zorunlu." }, { status: 400 });
    }
    const nextRunAt = data.type === "once" && data.schedule ? new Date(data.schedule) : undefined;

    const job = await prisma.toolJob.upsert({
      where: { toolId_name: { toolId: tool.id, name: data.name } },
      create: { toolId: tool.id, toolSlug: slug, name: data.name, type: data.type, schedule: data.schedule, code: data.code, status: "active", nextRunAt },
      update: { type: data.type, schedule: data.schedule, code: data.code, status: "active", nextRunAt },
    });

    if (data.type === "cron" && data.schedule) {
      scheduleJob(job.id, data.schedule);
    }
    return NextResponse.json({ ok: true, id: job.id });
  }

  const job = await prisma.toolJob.findUnique({ where: { toolId_name: { toolId: tool.id, name: data.name } } });
  if (!job) return NextResponse.json({ error: "Job bulunamadı." }, { status: 404 });

  if (data.op === "cancel") {
    stopJob(job.id);
    await prisma.toolJob.update({ where: { id: job.id }, data: { status: "cancelled" } });
    return NextResponse.json({ ok: true });
  }

  if (data.op === "pause") {
    stopJob(job.id);
    await prisma.toolJob.update({ where: { id: job.id }, data: { status: "paused" } });
    return NextResponse.json({ ok: true });
  }

  if (data.op === "resume") {
    await prisma.toolJob.update({ where: { id: job.id }, data: { status: "active" } });
    if (job.type === "cron" && job.schedule) scheduleJob(job.id, job.schedule);
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "Bilinmeyen işlem." }, { status: 400 });
}

import { Cron } from "croner";
import { prisma } from "@/lib/db";
import { runJob } from "./runner";

// jobId → Cron instance
const cronInstances = new Map<string, Cron>();

export async function startScheduler(): Promise<void> {
  console.log("[jobs] Scheduler başlatılıyor…");

  // Sunucu yeniden başlarken aktif cron job'larını yükle
  const jobs = await prisma.toolJob.findMany({ where: { status: "active", type: "cron" } });
  for (const job of jobs) {
    if (job.schedule) scheduleJob(job.id, job.schedule);
  }

  // "once" job'ları tek seferlik kontrol (önce varsa çalıştır)
  checkOnceJobs();

  console.log(`[jobs] ${jobs.length} cron job yüklendi.`);
}

export function scheduleJob(jobId: string, cronExpr: string): void {
  stopJob(jobId);
  try {
    const instance = new Cron(cronExpr, async () => {
      await runJob(jobId);
    });
    cronInstances.set(jobId, instance);
  } catch (err) {
    console.error(`[jobs] Geçersiz cron ifadesi (${jobId}): ${(err as Error).message}`);
  }
}

export function stopJob(jobId: string): void {
  const instance = cronInstances.get(jobId);
  if (instance) {
    instance.stop();
    cronInstances.delete(jobId);
  }
}

async function checkOnceJobs(): Promise<void> {
  const now = new Date();
  const due = await prisma.toolJob.findMany({
    where: { status: "active", type: "once", nextRunAt: { lte: now } },
  });
  for (const job of due) {
    await runJob(job.id);
    await prisma.toolJob.update({ where: { id: job.id }, data: { status: "cancelled" } });
  }
  // Her dakika tekrar kontrol et
  setTimeout(checkOnceJobs, 60_000);
}

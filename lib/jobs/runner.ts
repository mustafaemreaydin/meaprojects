import vm from "node:vm";
import { prisma } from "@/lib/db";
import { buildJobContext } from "./context";

export async function runJob(jobId: string): Promise<void> {
  const job = await prisma.toolJob.findUnique({ where: { id: jobId } });
  if (!job || job.status === "cancelled" || job.status === "paused") return;

  const run = await prisma.toolJobRun.create({ data: { jobId, status: "running" } });

  const { ctx, getLogs } = buildJobContext(job.toolId, job.toolSlug);

  try {
    const sandbox = vm.createContext(ctx as unknown as vm.Context);
    const script = new vm.Script(`(async () => { ${job.code} })()`);
    await script.runInContext(sandbox, { timeout: 60_000 });

    await prisma.toolJobRun.update({
      where: { id: run.id },
      data: { status: "success", endedAt: new Date(), output: getLogs().join("\n") || null },
    });
  } catch (err) {
    await prisma.toolJobRun.update({
      where: { id: run.id },
      data: {
        status: "error",
        endedAt: new Date(),
        error: (err as Error).message,
        output: getLogs().join("\n") || null,
      },
    });
  }

  await prisma.toolJob.update({
    where: { id: jobId },
    data: { lastRunAt: new Date() },
  });
}

import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/access";
import { redirect } from "next/navigation";
import { JobsView } from "./jobs-view";

export const dynamic = "force-dynamic";

export default async function JobsPage() {
  const user = await getCurrentUser();
  if (!user || user.role !== "admin") redirect("/apps");

  const jobs = await prisma.toolJob.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      runs: { orderBy: { startedAt: "desc" }, take: 1 },
    },
  });

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-h1 text-text">Background Jobs</h1>
        <p className="mt-1 text-[14px] text-text-muted">
          Tool'ların arka planda çalışan görevleri.
        </p>
      </div>
      <JobsView jobs={jobs} />
    </div>
  );
}

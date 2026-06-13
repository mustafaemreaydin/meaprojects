"use client";

import * as React from "react";
import { useRouter } from "next/navigation";

type JobRun = { status: string; startedAt: Date; endedAt: Date | null; error: string | null };
type Job = {
  id: string;
  toolSlug: string;
  name: string;
  type: string;
  schedule: string | null;
  status: string;
  lastRunAt: Date | null;
  createdAt: Date;
  runs: JobRun[];
};

const STATUS_COLORS: Record<string, string> = {
  active:    "bg-[#3d7a56] text-white",
  paused:    "bg-[#a07830] text-white",
  cancelled: "bg-[var(--border)] text-text-muted",
};

const RUN_COLORS: Record<string, string> = {
  success: "text-[#3d7a56]",
  error:   "text-[#b83232]",
  running: "text-[#a07830]",
};

export function JobsView({ jobs }: { jobs: Job[] }) {
  const router = useRouter();
  const [loading, setLoading] = React.useState<string | null>(null);

  async function action(jobId: string, op: "pause" | "resume" | "cancel") {
    setLoading(jobId + op);
    await fetch(`/api/admin/jobs/${jobId}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ op }),
    });
    router.refresh();
    setLoading(null);
  }

  if (jobs.length === 0) {
    return (
      <div className="rounded-xl border border-[var(--border)] p-12 text-center text-[14px] text-text-muted">
        Henüz kayıtlı arka plan görevi yok.
        <br />
        Tool'lardan <code className="font-mono text-text">meaprojects.jobs.register()</code> ile oluşturulur.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {jobs.map((job) => {
        const lastRun = job.runs[0];
        return (
          <div key={job.id} className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4">
            <div className="flex items-start justify-between gap-4">
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-2">
                  <span className="text-[13px] font-medium text-text">{job.toolSlug}</span>
                  <span className="text-text-muted">/</span>
                  <span className="text-[13px] font-mono text-text">{job.name}</span>
                  <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${STATUS_COLORS[job.status] ?? ""}`}>
                    {job.status}
                  </span>
                </div>
                <div className="flex items-center gap-3 text-[12px] text-text-muted">
                  <span className="font-mono">{job.type}{job.schedule ? ` · ${job.schedule}` : ""}</span>
                  {job.lastRunAt && <span>Son çalışma: {new Date(job.lastRunAt).toLocaleString("tr")}</span>}
                  {lastRun && (
                    <span className={RUN_COLORS[lastRun.status]}>
                      {lastRun.status === "error" ? `Hata: ${lastRun.error}` : lastRun.status}
                    </span>
                  )}
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                {job.status === "active" && (
                  <button
                    onClick={() => action(job.id, "pause")}
                    disabled={!!loading}
                    className="rounded-lg border border-[var(--border)] px-3 py-1.5 text-[12px] text-text-muted hover:text-text"
                  >
                    Duraklat
                  </button>
                )}
                {job.status === "paused" && (
                  <button
                    onClick={() => action(job.id, "resume")}
                    disabled={!!loading}
                    className="rounded-lg border border-[var(--border)] px-3 py-1.5 text-[12px] text-text-muted hover:text-text"
                  >
                    Devam
                  </button>
                )}
                {job.status !== "cancelled" && (
                  <button
                    onClick={() => action(job.id, "cancel")}
                    disabled={!!loading}
                    className="rounded-lg border border-[#b83232] px-3 py-1.5 text-[12px] text-[#b83232] hover:bg-[#b83232] hover:text-white"
                  >
                    İptal
                  </button>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

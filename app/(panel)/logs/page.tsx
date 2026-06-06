import { prisma } from "@/lib/db";
import { LogsTable, type LogRow } from "./logs-table";
import { EmptyState } from "@/components/ui/empty-state";
import { ScrollText } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function LogsPage() {
  const [calls, runs] = await Promise.all([
    prisma.llmCall.findMany({ orderBy: { createdAt: "desc" }, take: 200 }),
    prisma.toolRun.findMany({
      orderBy: { startedAt: "desc" },
      take: 200,
      include: { tool: true },
    }),
  ]);

  const rows: LogRow[] = [
    ...calls.map<LogRow>((c) => ({
      id: `c-${c.id}`,
      kind: "llm-call",
      time: c.createdAt.toISOString(),
      tool: c.toolSlug ?? "—",
      model: c.model,
      provider: c.provider,
      inputTokens: c.inputTokens,
      outputTokens: c.outputTokens,
      costUsd: c.costUsd ?? null,
      status: "ok",
      payload: {
        provider: c.provider,
        model: c.model,
        inputTokens: c.inputTokens,
        outputTokens: c.outputTokens,
        costUsd: c.costUsd,
      },
    })),
    ...runs.map<LogRow>((r) => ({
      id: `r-${r.id}`,
      kind: "run",
      time: r.startedAt.toISOString(),
      tool: r.tool.slug,
      model: "—",
      provider: "—",
      inputTokens: 0,
      outputTokens: 0,
      costUsd: null,
      status: r.status,
      payload: { toolName: r.tool.name, status: r.status, endedAt: r.endedAt },
    })),
  ].sort((a, b) => (a.time < b.time ? 1 : -1));

  return (
    <div className="flex flex-col gap-8">
      <header>
        <h1 className="text-h1 text-text">Logs</h1>
        <p className="mt-2 text-[14px] text-text-muted">
          Last 200 LLM calls and tool runs. Click a row to see details.
        </p>
      </header>

      {rows.length === 0 ? (
        <EmptyState
          icon={<ScrollText size={20} />}
          title="No logs yet."
          description="Run a tool that calls a model and the rows will appear here."
        />
      ) : (
        <LogsTable rows={rows} />
      )}
    </div>
  );
}

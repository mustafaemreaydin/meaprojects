"use client";

import * as React from "react";
import { X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { cn, formatDateTime, formatRelativeTime } from "@/lib/utils";

export interface LogRow {
  id: string;
  kind: "llm-call" | "run";
  time: string;
  tool: string;
  model: string;
  provider: string;
  inputTokens: number;
  outputTokens: number;
  costUsd: number | null;
  status: string;
  payload: unknown;
}

type Filter = "all" | "llm-call" | "run";

export function LogsTable({ rows }: { rows: LogRow[] }) {
  const [filter, setFilter] = React.useState<Filter>("all");
  const [q, setQ] = React.useState("");
  const [selected, setSelected] = React.useState<LogRow | null>(null);

  const visible = React.useMemo(() => {
    let arr = rows;
    if (filter !== "all") arr = arr.filter((r) => r.kind === filter);
    if (q.trim()) {
      const n = q.trim().toLowerCase();
      arr = arr.filter(
        (r) =>
          r.tool.toLowerCase().includes(n) ||
          r.model.toLowerCase().includes(n) ||
          r.provider.toLowerCase().includes(n)
      );
    }
    return arr;
  }, [rows, q, filter]);

  return (
    <>
      <div className="flex items-center gap-3">
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Filter: tool / model / provider"
          className="max-w-[360px]"
        />
        <div className="flex items-center gap-1.5">
          {(["all", "llm-call", "run"] as Filter[]).map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setFilter(f)}
              className={cn(
                "rounded-md px-3 py-1.5 text-[13px] transition-colors",
                filter === f
                  ? "bg-ink-100 text-ink-900 dark:bg-ink-700 dark:text-paper-100"
                  : "text-text-muted hover:text-text hover:bg-paper-200 dark:hover:bg-ink-700"
              )}
            >
              {f === "all" ? "All" : f === "llm-call" ? "LLM call" : "Run"}
            </button>
          ))}
        </div>
        <span className="ml-auto text-[12px] text-text-muted">{visible.length} rows</span>
      </div>

      <div className="mt-5 overflow-hidden rounded-lg border border-ink-100 dark:border-ink-600">
        <table className="w-full text-[13px]">
          <thead className="bg-paper-100 dark:bg-ink-700">
            <tr>
              <Th>Time</Th>
              <Th>Tool</Th>
              <Th>Type</Th>
              <Th>Model</Th>
              <Th className="text-right">Tokens (in/out)</Th>
              <Th className="text-right">Cost</Th>
              <Th>Status</Th>
            </tr>
          </thead>
          <tbody>
            {visible.map((r) => (
              <tr
                key={r.id}
                onClick={() => setSelected(r)}
                className="cursor-pointer border-t border-ink-100 hover:bg-paper-100/50 dark:border-ink-600 dark:hover:bg-ink-700/40"
              >
                <Td title={formatDateTime(r.time)}>{formatRelativeTime(r.time)}</Td>
                <Td className="font-mono">{r.tool}</Td>
                <Td>
                  <Badge tone={r.kind === "llm-call" ? "accent" : "neutral"}>
                    {r.kind === "llm-call" ? "llm" : "run"}
                  </Badge>
                </Td>
                <Td className="font-mono text-[12px]">{r.model}</Td>
                <Td className="text-right tabular-nums">
                  {r.inputTokens + r.outputTokens > 0
                    ? `${r.inputTokens}/${r.outputTokens}`
                    : "—"}
                </Td>
                <Td className="text-right tabular-nums">
                  {r.costUsd != null ? `$${r.costUsd.toFixed(4)}` : "—"}
                </Td>
                <Td>
                  <Badge
                    tone={
                      r.status === "error"
                        ? "danger"
                        : r.status === "completed" || r.status === "ok"
                        ? "success"
                        : "neutral"
                    }
                  >
                    {r.status}
                  </Badge>
                </Td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {selected && <LogDrawer row={selected} onClose={() => setSelected(null)} />}
    </>
  );
}

function Th({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <th className={cn("px-3 py-2.5 text-left caption", className)}>{children}</th>
  );
}
function Td({
  children,
  className,
  title,
}: {
  children: React.ReactNode;
  className?: string;
  title?: string;
}) {
  return (
    <td title={title} className={cn("px-3 py-2.5 text-text", className)}>
      {children}
    </td>
  );
}

function LogDrawer({ row, onClose }: { row: LogRow; onClose: () => void }) {
  React.useEffect(() => {
    const h = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50" onClick={onClose}>
      <div className="absolute inset-0 bg-ink-900/30 backdrop-blur-sm animate-fade-in" />
      <aside
        onClick={(e) => e.stopPropagation()}
        className="absolute right-0 top-0 h-full w-full max-w-[480px] border-l border-ink-100 bg-[var(--bg)] dark:border-ink-700 animate-slide-up overflow-y-auto"
      >
        <div className="flex items-center justify-between border-b border-ink-100 px-5 py-3 dark:border-ink-700">
          <div>
            <div className="caption">Log detail</div>
            <div className="text-[14.5px] font-medium text-text mt-0.5">{row.tool}</div>
          </div>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-md text-text-muted hover:bg-paper-200 dark:hover:bg-ink-700"
            aria-label="Close"
          >
            <X size={15} />
          </button>
        </div>
        <div className="px-5 py-4 space-y-4">
          <Field label="Time">{formatDateTime(row.time)}</Field>
          <Field label="Type">{row.kind}</Field>
          <Field label="Provider">{row.provider}</Field>
          <Field label="Model"><code>{row.model}</code></Field>
          <Field label="Status">{row.status}</Field>
          <div>
            <div className="caption mb-2">Payload</div>
            <pre className="rounded-md bg-ink-800 p-3 text-[12px] text-paper-100 overflow-x-auto">
              {JSON.stringify(row.payload, null, 2)}
            </pre>
          </div>
        </div>
      </aside>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <span className="caption">{label}</span>
      <span className="text-[13px] text-text text-right">{children}</span>
    </div>
  );
}

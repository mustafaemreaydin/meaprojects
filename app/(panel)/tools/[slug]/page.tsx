import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { prisma } from "@/lib/db";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { describePermission } from "@/lib/permissions";
import { formatDateTime, formatRelativeTime } from "@/lib/utils";
import { ToolActionsMenu } from "./tool-actions-menu";

export const dynamic = "force-dynamic";

export default async function ToolDetailPage({ params }: { params: { slug: string } }) {
  const tool = await prisma.tool.findUnique({
    where: { slug: params.slug },
    include: {
      storages: { orderBy: { key: "asc" } },
      runs: { orderBy: { startedAt: "desc" }, take: 10 },
    },
  });
  if (!tool) notFound();

  const permissions: string[] = safeArr(tool.permissions);
  const manifest = safeJson<Record<string, unknown>>(tool.manifest) ?? {};
  const llmCalls = await prisma.llmCall.findMany({
    where: { toolSlug: tool.slug },
    orderBy: { createdAt: "desc" },
    take: 20,
  });

  const isBackend = tool.type === "backend";
  const disabled = tool.status !== "installed";

  return (
    <div className="flex flex-col gap-10">
      <header className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="flex items-start gap-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-paper-200 text-[22px] font-semibold text-ink-700 dark:bg-ink-700 dark:text-paper-100">
            {tool.name.slice(0, 1).toUpperCase()}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-h1 text-text">{tool.name}</h1>
              <Badge tone="outline">v{tool.version}</Badge>
              <Badge tone={isBackend ? "warning" : "neutral"}>{tool.type}</Badge>
              {disabled && <Badge tone="warning">{tool.status}</Badge>}
            </div>
            {tool.description && (
              <p className="mt-2 max-w-[640px] text-[14.5px] text-text-muted">{tool.description}</p>
            )}
            <div className="mt-2 text-[12.5px] text-text-muted">
              installed: {formatDateTime(tool.installedAt)} · slug:{" "}
              <span className="font-mono">{tool.slug}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {isBackend ? (
            <Button disabled title="Backend tool support coming in v2">
              v2
            </Button>
          ) : (
            <Button asChild disabled={disabled}>
              <Link href={`/tools/${tool.slug}/run`}>
                Run <ArrowRight size={14} />
              </Link>
            </Button>
          )}
          <ToolActionsMenu slug={tool.slug} status={tool.status} />
        </div>
      </header>

      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="permissions">Permissions</TabsTrigger>
          <TabsTrigger value="storage">Storage</TabsTrigger>
          <TabsTrigger value="logs">Logs</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
            {Object.entries(manifest).map(([k, v]) => (
              <div
                key={k}
                className="flex items-start justify-between gap-4 rounded-md border border-ink-100 px-4 py-3 dark:border-ink-600"
              >
                <span className="caption">{k}</span>
                <span className="max-w-[60%] truncate text-right text-[13px] text-text font-mono">
                  {typeof v === "object" ? JSON.stringify(v) : String(v)}
                </span>
              </div>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="permissions">
          {permissions.length === 0 ? (
            <p className="text-[14px] text-text-muted">No permissions requested.</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {permissions.map((p) => {
                const info = describePermission(p);
                return (
                  <li
                    key={p}
                    className="rounded-md border border-ink-100 px-4 py-3 dark:border-ink-600"
                  >
                    <div className="text-[14px] font-medium text-text">{info.label}</div>
                    <div className="text-[13px] text-text-muted mt-0.5">{info.description}</div>
                  </li>
                );
              })}
            </ul>
          )}
        </TabsContent>

        <TabsContent value="storage">
          {tool.storages.length === 0 ? (
            <p className="text-[14px] text-text-muted">No storage records yet.</p>
          ) : (
            <div className="overflow-hidden rounded-md border border-ink-100 dark:border-ink-600">
              <table className="w-full text-[13px]">
                <thead className="bg-paper-100 dark:bg-ink-700">
                  <tr>
                    <th className="px-3 py-2 text-left caption">key</th>
                    <th className="px-3 py-2 text-left caption">value</th>
                  </tr>
                </thead>
                <tbody>
                  {tool.storages.map((s) => (
                    <tr key={s.id} className="border-t border-ink-100 dark:border-ink-600">
                      <td className="px-3 py-2 font-mono">{s.key}</td>
                      <td className="px-3 py-2 font-mono text-text-muted truncate max-w-[400px]">{s.value}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </TabsContent>

        <TabsContent value="logs">
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <div>
              <h3 className="text-h3 text-text mb-3">Recent runs</h3>
              {tool.runs.length === 0 ? (
                <p className="text-[13px] text-text-muted">None.</p>
              ) : (
                <ul className="text-[13px]">
                  {tool.runs.map((r) => (
                    <li
                      key={r.id}
                      className="flex items-center justify-between border-b border-ink-100 py-2 dark:border-ink-600"
                    >
                      <span>{formatRelativeTime(r.startedAt)}</span>
                      <Badge tone={r.status === "error" ? "danger" : r.status === "completed" ? "success" : "neutral"}>
                        {r.status}
                      </Badge>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div>
              <h3 className="text-h3 text-text mb-3">Recent LLM calls</h3>
              {llmCalls.length === 0 ? (
                <p className="text-[13px] text-text-muted">None.</p>
              ) : (
                <ul className="text-[13px]">
                  {llmCalls.map((c) => (
                    <li
                      key={c.id}
                      className="flex items-center justify-between gap-2 border-b border-ink-100 py-2 dark:border-ink-600"
                    >
                      <span className="text-text-muted">{formatRelativeTime(c.createdAt)}</span>
                      <span className="font-mono text-[12px]">{c.model}</span>
                      <span className="text-text-muted">
                        {c.inputTokens}/{c.outputTokens} tok
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function safeArr(s: string): string[] {
  try {
    const v = JSON.parse(s);
    return Array.isArray(v) ? v.map(String) : [];
  } catch {
    return [];
  }
}
function safeJson<T>(s: string): T | null {
  try {
    return JSON.parse(s) as T;
  } catch {
    return null;
  }
}

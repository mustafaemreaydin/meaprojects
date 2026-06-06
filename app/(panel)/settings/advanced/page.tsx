import { prisma } from "@/lib/db";
import { Card, CardContent } from "@/components/ui/card";
import { AdvancedActions } from "./advanced-actions";

export default async function AdvancedPage() {
  const [toolCount, runCount, llmCount, storageCount] = await Promise.all([
    prisma.tool.count(),
    prisma.toolRun.count(),
    prisma.llmCall.count(),
    prisma.toolStorage.count(),
  ]);

  return (
    <div className="flex flex-col gap-6 max-w-[640px]">
      <div>
        <h2 className="text-h2 text-text">Advanced</h2>
        <p className="mt-1 text-[14px] text-text-muted">
          Bulk operations on local data. Irreversible — use with care.
        </p>
      </div>

      <Card>
        <CardContent className="space-y-4 py-5">
          <Row label="Installed tools" value={toolCount.toString()} />
          <Row label="Run records" value={runCount.toString()} />
          <Row label="LLM call records" value={llmCount.toString()} />
          <Row label="Storage entries" value={storageCount.toString()} />
        </CardContent>
      </Card>

      <AdvancedActions />

      <p className="text-[12.5px] text-text-muted">
        Backup and restore (export / import) is coming in v2. For now, copy{" "}
        <code className="font-mono">data/meaprojects.db</code> and the{" "}
        <code className="font-mono">tools/</code> folder manually.
      </p>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-b border-ink-100 pb-3 last:border-b-0 last:pb-0 dark:border-ink-600">
      <span className="caption">{label}</span>
      <span className="text-[14px] text-text">{value}</span>
    </div>
  );
}

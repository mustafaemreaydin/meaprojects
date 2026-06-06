"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";

type Op = "clear-logs" | "clear-llm-calls" | "clear-storage";

const ACTIONS: { op: Op; label: string; description: string; confirm: string }[] = [
  {
    op: "clear-llm-calls",
    label: "Clear LLM call history",
    description: "Deletes all LlmCall records. Affects metrics on this page and the Logs page.",
    confirm: "Are you sure you want to delete all LLM call records?",
  },
  {
    op: "clear-logs",
    label: "Clear run records",
    description: "Deletes all ToolRun records. Installed tools are not affected.",
    confirm: "Are you sure you want to delete all run records?",
  },
  {
    op: "clear-storage",
    label: "Clear tool storage",
    description: "Deletes all ToolStorage entries. Any data tools have saved will be lost.",
    confirm: "Are you sure you want to delete all tool storage entries?",
  },
];

export function AdvancedActions() {
  return (
    <Card>
      <CardContent className="divide-y divide-ink-100 py-1 dark:divide-ink-600">
        {ACTIONS.map((a) => (
          <ActionRow key={a.op} {...a} />
        ))}
      </CardContent>
    </Card>
  );
}

function ActionRow({
  op,
  label,
  description,
  confirm: confirmText,
}: {
  op: Op;
  label: string;
  description: string;
  confirm: string;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();

  function run() {
    if (!confirm(confirmText)) return;
    start(async () => {
      const res = await fetch("/api/settings/advanced", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ op }),
      });
      const body = await res.json().catch(() => ({}));
      if (res.ok) {
        toast.success(`${body.deleted ?? 0} records deleted.`);
        router.refresh();
      } else {
        toast.error(body.error ?? "Operation failed.");
      }
    });
  }

  return (
    <div className="flex items-start justify-between gap-4 py-4">
      <div className="flex flex-col gap-1">
        <span className="text-[14px] text-text">{label}</span>
        <span className="text-[12.5px] text-text-muted">{description}</span>
      </div>
      <Button type="button" size="sm" variant="danger" onClick={run} disabled={pending}>
        {pending ? <Spinner size={12} /> : null}
        Clear
      </Button>
    </div>
  );
}

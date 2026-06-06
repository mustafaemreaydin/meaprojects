"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatDateTime, formatRelativeTime } from "@/lib/utils";

export interface RequestItem {
  id: string;
  name: string;
  email: string;
  message: string;
  createdAt: string;
}

export function RequestsList({ items }: { items: RequestItem[] }) {
  const router = useRouter();
  const [pending, setPending] = React.useState<string | null>(null);

  async function removeOne(id: string) {
    setPending(id);
    const res = await fetch(`/api/admin/requests/${id}`, { method: "DELETE" });
    setPending(null);
    if (res.ok) {
      toast.success("Request deleted.");
      router.refresh();
    } else {
      toast.error("Could not delete.");
    }
  }

  async function clearAll() {
    if (!confirm(`Delete all ${items.length} requests? This cannot be undone.`)) return;
    setPending("__all__");
    const res = await fetch("/api/admin/requests", { method: "DELETE" });
    setPending(null);
    if (res.ok) {
      toast.success("All requests cleared.");
      router.refresh();
    } else {
      toast.error("Could not clear requests.");
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-text-muted">
          {items.length} request{items.length === 1 ? "" : "s"}
        </p>
        <Button
          size="sm"
          variant="danger"
          onClick={clearAll}
          disabled={pending === "__all__"}
        >
          <Trash2 size={13} /> Clear all
        </Button>
      </div>

      <ul className="flex flex-col gap-3">
        {items.map((r) => (
          <li
            key={r.id}
            className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 dark:bg-ink-800"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-[14.5px] font-medium text-text">{r.name}</span>
                  <a
                    href={`mailto:${r.email}`}
                    className="text-[12.5px] text-text-muted underline-offset-4 hover:text-text hover:underline"
                  >
                    {r.email}
                  </a>
                </div>
                <p className="mt-2 max-w-[680px] whitespace-pre-wrap text-[13.5px] leading-relaxed text-text">
                  {r.message}
                </p>
              </div>
              <div className="flex shrink-0 flex-col items-end gap-2">
                <span className="text-[11.5px] text-text-muted" title={formatDateTime(r.createdAt)}>
                  {formatRelativeTime(r.createdAt)}
                </span>
                <button
                  type="button"
                  data-rid={r.id}
                  onClick={() => removeOne(r.id)}
                  disabled={pending === r.id}
                  aria-label="Delete request"
                  className="flex h-7 w-7 items-center justify-center rounded-md text-text-muted transition-colors hover:bg-[var(--bg-elevated)] hover:text-[var(--danger)] disabled:opacity-50"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

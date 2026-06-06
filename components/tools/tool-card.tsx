import Link from "next/link";
import { ArrowRight, MoreHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn, formatRelativeTime } from "@/lib/utils";

export interface ToolCardItem {
  slug: string;
  name: string;
  description?: string | null;
  type: string;
  version: string;
  status: string;
  updatedAt?: Date | string;
}

export function ToolCard({ item, compact = false }: { item: ToolCardItem; compact?: boolean }) {
  const disabled = item.status !== "installed";
  const isBackend = item.type === "backend";

  return (
    <div
      className={cn(
        "group flex items-center gap-4 rounded-lg border border-ink-100 bg-[var(--surface)] p-4 transition-colors dark:border-ink-600",
        "hover:border-ink-300"
      )}
    >
      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-paper-200 text-ink-700 text-[15px] font-semibold dark:bg-ink-700 dark:text-paper-100">
        {item.name.slice(0, 1).toUpperCase()}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <Link
            href={`/tools/${item.slug}`}
            className="truncate text-[15px] font-medium text-text hover:underline underline-offset-4"
          >
            {item.name}
          </Link>
          <Badge tone={isBackend ? "outline" : "neutral"} className="shrink-0">
            {item.type}
          </Badge>
          {disabled && (
            <Badge tone="warning" className="shrink-0">
              {item.status}
            </Badge>
          )}
        </div>
        {!compact && item.description && (
          <p className="mt-0.5 truncate text-[13px] text-text-muted">{item.description}</p>
        )}
        <div className="mt-1 flex items-center gap-1.5 text-[12px] text-text-muted">
          <span>v{item.version}</span>
          <span aria-hidden>·</span>
          <span className="font-mono">{item.slug}</span>
          {item.updatedAt && (
            <>
              <span aria-hidden>·</span>
              <span>{formatRelativeTime(item.updatedAt)}</span>
            </>
          )}
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-1">
        {isBackend ? (
          <Button variant="secondary" size="sm" disabled title="Backend tool support coming in v2">
            v2
          </Button>
        ) : (
          <Button asChild variant="primary" size="sm" disabled={disabled}>
            <Link href={`/tools/${item.slug}/run`}>
              Open <ArrowRight size={14} />
            </Link>
          </Button>
        )}
        <Button asChild variant="ghost" size="icon" aria-label="Details">
          <Link href={`/tools/${item.slug}`}>
            <MoreHorizontal size={16} />
          </Link>
        </Button>
      </div>
    </div>
  );
}

"use client";

import * as React from "react";
import { Search } from "lucide-react";
import { ToolCard, type ToolCardItem } from "@/components/tools/tool-card";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type TypeFilter = "all" | "static" | "spa" | "backend";

const FILTERS: { id: TypeFilter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "static", label: "Static" },
  { id: "spa", label: "SPA" },
  { id: "backend", label: "Backend" },
];

export function ToolsBrowser({ tools }: { tools: ToolCardItem[] }) {
  const [q, setQ] = React.useState("");
  const [filter, setFilter] = React.useState<TypeFilter>("all");
  const [sort, setSort] = React.useState<"recent" | "name">("recent");

  const visible = React.useMemo(() => {
    let arr = tools.slice();
    if (filter !== "all") arr = arr.filter((t) => t.type === filter);
    if (q.trim()) {
      const needle = q.trim().toLowerCase();
      arr = arr.filter(
        (t) =>
          t.name.toLowerCase().includes(needle) ||
          (t.description ?? "").toLowerCase().includes(needle) ||
          t.slug.toLowerCase().includes(needle)
      );
    }
    arr.sort((a, b) => {
      if (sort === "name") return a.name.localeCompare(b.name, "en");
      const aT = new Date(a.updatedAt ?? 0).getTime();
      const bT = new Date(b.updatedAt ?? 0).getTime();
      return bT - aT;
    });
    return arr;
  }, [tools, q, filter, sort]);

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-3 md:flex-row md:items-center">
        <div className="relative flex-1 max-w-[420px]">
          <Search
            size={14}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted"
            aria-hidden
          />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search tools..."
            className="pl-9"
          />
        </div>

        <div className="flex items-center gap-1.5">
          {FILTERS.map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => setFilter(f.id)}
              className={cn(
                "rounded-md px-3 py-1.5 text-[13px] transition-colors",
                filter === f.id
                  ? "bg-ink-100 text-ink-900 dark:bg-ink-700 dark:text-paper-100"
                  : "text-text-muted hover:text-text hover:bg-paper-200 dark:hover:bg-ink-700"
              )}
            >
              {f.label}
            </button>
          ))}
        </div>

        <select
          value={sort}
          onChange={(e) => setSort(e.target.value as "recent" | "name")}
          className="ml-auto h-9 rounded-md border border-ink-100 bg-[var(--surface)] px-2.5 text-[13px] text-text dark:border-ink-600"
        >
          <option value="recent">Newest</option>
          <option value="name">A–Z</option>
        </select>
      </div>

      {visible.length === 0 ? (
        <p className="rounded-lg border border-dashed border-ink-200 px-5 py-12 text-center text-[14px] text-text-muted dark:border-ink-600">
          No tools match your search.
        </p>
      ) : (
        <ul className="flex flex-col gap-2.5">
          {visible.map((t) => (
            <li key={t.slug}>
              <ToolCard item={t} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

"use client";

import Link from "next/link";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { cn } from "@/lib/utils";

interface DocItem {
  id: string;
  label: string;
}

export function DocsNav({ items, activeId }: { items: DocItem[]; activeId: string }) {
  return (
    <nav>
      <ul className="flex flex-col gap-0.5">
        {items.map((item) => {
          const active = item.id === activeId;
          return (
            <li key={item.id}>
              <Link
                href={`/docs?doc=${item.id}`}
                className={cn(
                  "block rounded-md px-2.5 py-2 text-[13.5px]",
                  active
                    ? "bg-ink-100 text-ink-900 dark:bg-ink-700 dark:text-paper-100"
                    : "text-text-muted hover:text-text hover:bg-paper-200 dark:hover:bg-ink-700"
                )}
              >
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

export function DocsArticle({ markdown }: { markdown: string }) {
  return (
    <article className="docs-prose max-w-[760px]">
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{markdown}</ReactMarkdown>
    </article>
  );
}

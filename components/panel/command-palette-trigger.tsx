"use client";

import { Search } from "lucide-react";
import { Kbd } from "@/components/ui/kbd";

export function CommandPaletteTrigger() {
  return (
    <button
      type="button"
      onClick={() => {
        const ev = new KeyboardEvent("keydown", { key: "k", metaKey: true, ctrlKey: true });
        window.dispatchEvent(ev);
      }}
      className="hidden md:inline-flex items-center gap-2 h-9 min-w-[280px] rounded-md border border-ink-100 dark:border-ink-600 bg-[var(--bg-elevated)] px-3 text-[13px] text-text-muted hover:border-ink-300 transition-colors"
    >
      <Search size={14} />
      <span className="flex-1 text-left">What do you want to do?</span>
      <span className="flex items-center gap-0.5">
        <Kbd>⌘</Kbd>
        <Kbd>K</Kbd>
      </span>
    </button>
  );
}

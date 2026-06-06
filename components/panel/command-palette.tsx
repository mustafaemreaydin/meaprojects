"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Command } from "cmdk";
import {
  Search,
  LayoutDashboard,
  LayoutGrid,
  Boxes,
  ScrollText,
  Settings,
  BookOpen,
  UploadCloud,
  Users,
  KeyRound,
  Moon,
  Sun,
} from "lucide-react";
import { useTheme } from "next-themes";
import { cn } from "@/lib/utils";

interface ToolEntry {
  slug: string;
  name: string;
}

export function CommandPalette({ tools, isAdmin = false }: { tools: ToolEntry[]; isAdmin?: boolean }) {
  const [open, setOpen] = React.useState(false);
  const router = useRouter();
  const { setTheme } = useTheme();

  React.useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((s) => !s);
      }
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  const go = React.useCallback(
    (path: string) => {
      setOpen(false);
      router.push(path);
    },
    [router]
  );

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-start justify-center pt-[120px] bg-ink-900/40 backdrop-blur-sm animate-fade-in"
      onClick={() => setOpen(false)}
    >
      <div
        className="w-full max-w-[560px] rounded-xl border border-ink-100 bg-[var(--surface)] shadow-lg dark:border-ink-600 overflow-hidden animate-slide-up"
        onClick={(e) => e.stopPropagation()}
      >
        <Command label="Command palette" loop>
          <div className="flex items-center gap-2.5 border-b border-ink-100 dark:border-ink-600 px-4">
            <Search size={16} className="text-text-muted" />
            <Command.Input
              autoFocus
              placeholder="What do you want to do?"
              className="h-12 w-full bg-transparent text-[14.5px] text-text placeholder:text-text-muted outline-none"
            />
            <span className="kbd">Esc</span>
          </div>
          <Command.List className="max-h-[400px] overflow-y-auto p-2">
            <Command.Empty className="px-3 py-8 text-center text-[13px] text-text-muted">
              No results.
            </Command.Empty>

            <Command.Group heading="Pages" className={cn(groupClass)}>
              <CmdItem onSelect={() => go("/apps")} icon={<LayoutGrid size={14} />}>
                Apps
              </CmdItem>
              {isAdmin && (
                <>
                  <CmdItem onSelect={() => go("/dashboard")} icon={<LayoutDashboard size={14} />}>
                    Dashboard
                  </CmdItem>
                  <CmdItem onSelect={() => go("/tools")} icon={<Boxes size={14} />}>
                    Tools
                  </CmdItem>
                  <CmdItem onSelect={() => go("/admin/users")} icon={<Users size={14} />}>
                    Users
                  </CmdItem>
                  <CmdItem onSelect={() => go("/logs")} icon={<ScrollText size={14} />}>
                    Logs
                  </CmdItem>
                  <CmdItem onSelect={() => go("/settings")} icon={<Settings size={14} />}>
                    Settings
                  </CmdItem>
                  <CmdItem onSelect={() => go("/docs")} icon={<BookOpen size={14} />}>
                    Docs
                  </CmdItem>
                </>
              )}
            </Command.Group>

            {tools.length > 0 && (
              <Command.Group heading="Tools" className={cn(groupClass)}>
                {tools.map((t) => (
                  <CmdItem key={t.slug} onSelect={() => go(`/tools/${t.slug}/run`)} icon={<Boxes size={14} />}>
                    {t.name}
                  </CmdItem>
                ))}
              </Command.Group>
            )}

            <Command.Group heading="Actions" className={cn(groupClass)}>
              {isAdmin && (
                <>
                  <CmdItem onSelect={() => go("/tools/upload")} icon={<UploadCloud size={14} />}>
                    Upload new tool
                  </CmdItem>
                  <CmdItem onSelect={() => go("/settings/api-keys")} icon={<KeyRound size={14} />}>
                    Go to API keys
                  </CmdItem>
                </>
              )}
              <CmdItem onSelect={() => { setTheme("light"); setOpen(false); }} icon={<Sun size={14} />}>
                Switch to light theme
              </CmdItem>
              <CmdItem onSelect={() => { setTheme("dark"); setOpen(false); }} icon={<Moon size={14} />}>
                Switch to dark theme
              </CmdItem>
            </Command.Group>
          </Command.List>
        </Command>
      </div>
    </div>
  );
}

const groupClass =
  "[&_[cmdk-group-heading]]:caption [&_[cmdk-group-heading]]:px-3 [&_[cmdk-group-heading]]:pt-3 [&_[cmdk-group-heading]]:pb-1.5";

function CmdItem({
  children,
  onSelect,
  icon,
}: {
  children: React.ReactNode;
  onSelect: () => void;
  icon?: React.ReactNode;
}) {
  return (
    <Command.Item
      onSelect={onSelect}
      className="flex cursor-pointer items-center gap-2.5 rounded-md px-3 py-2 text-[13.5px] text-text data-[selected=true]:bg-paper-200 dark:data-[selected=true]:bg-ink-700"
    >
      <span className="text-text-muted">{icon}</span>
      <span>{children}</span>
    </Command.Item>
  );
}

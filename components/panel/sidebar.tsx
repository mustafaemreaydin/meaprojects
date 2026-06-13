"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import {
  LayoutDashboard,
  Boxes,
  LayoutGrid,
  ScrollText,
  Settings,
  BookOpen,
  UploadCloud,
  Users,
  Inbox,
  LogOut,
  Timer,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Logo } from "@/components/shared/logo";

interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  match?: (path: string) => boolean;
  adminOnly?: boolean;
}

const NAV: NavItem[] = [
  { href: "/apps", label: "Apps", icon: LayoutGrid },
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, adminOnly: true },
  { href: "/tools", label: "Tools", icon: Boxes, match: (p) => p.startsWith("/tools"), adminOnly: true },
  { href: "/admin/users", label: "Users", icon: Users, adminOnly: true },
  { href: "/admin/requests", label: "Requests", icon: Inbox, adminOnly: true },
  { href: "/jobs", label: "Jobs", icon: Timer, match: (p) => p.startsWith("/jobs"), adminOnly: true },
  { href: "/logs", label: "Logs", icon: ScrollText, adminOnly: true },
  { href: "/settings", label: "Settings", icon: Settings, match: (p) => p.startsWith("/settings"), adminOnly: true },
  { href: "/docs", label: "Docs", icon: BookOpen, adminOnly: true },
];

interface SidebarProps {
  name: string;
  email: string;
  role: "admin" | "member";
}

export function Sidebar({ name, email, role }: SidebarProps) {
  const pathname = usePathname();
  const initials = (name || email).slice(0, 1).toUpperCase();
  const isAdmin = role === "admin";
  const items = NAV.filter((i) => isAdmin || !i.adminOnly);

  return (
    <aside className="sticky top-0 h-screen w-[260px] shrink-0 flex flex-col border-r border-[var(--border)] bg-[var(--bg-elevated)]">
      {/* Brand */}
      <div className="px-5 pt-6 pb-4">
        <Link href={isAdmin ? "/dashboard" : "/apps"} aria-label="meaprojects.com" className="inline-block">
          <Logo size="lg" />
        </Link>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 pt-4 overflow-y-auto">
        <p className="caption px-2 mb-3">Navigation</p>
        <ul className="flex flex-col gap-0.5">
          {items.map((item) => {
            const active = item.match ? item.match(pathname) : pathname === item.href;
            const Icon = item.icon;
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={cn(
                    "group relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-[13.5px] transition-colors",
                    active
                      ? "bg-[var(--surface)] text-text"
                      : "text-text-muted hover:bg-[var(--surface)] hover:text-text"
                  )}
                  aria-current={active ? "page" : undefined}
                >
                  {active && (
                    <span
                      aria-hidden
                      className="absolute left-0 top-1/2 h-4 w-[3px] -translate-y-1/2 rounded-r-full bg-text"
                    />
                  )}
                  <Icon size={15} className="shrink-0" />
                  <span>{item.label}</span>
                </Link>
              </li>
            );
          })}
        </ul>

        {isAdmin && (
          <div className="mt-6">
            <p className="caption px-2 mb-3">Quick</p>
            <Link
              href="/tools/upload"
              className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-[13.5px] text-text-muted hover:bg-[var(--surface)] hover:text-text transition-colors"
            >
              <UploadCloud size={15} className="shrink-0" />
              <span>Upload tool</span>
            </Link>
          </div>
        )}
      </nav>

      {/* User */}
      <div className="px-3 pb-4 pt-3 border-t border-[var(--border)]">
        <div className="flex items-center gap-1">
          <Link
            href="/settings/account"
            aria-label="Account"
            className="group flex min-w-0 flex-1 items-center gap-3 rounded-lg px-3 py-2.5 hover:bg-[var(--surface)] transition-colors"
          >
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--surface)] border border-[var(--border)] text-text text-[12px] font-semibold group-hover:border-ink-400">
              {initials}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[13px] font-medium text-text leading-tight">{name}</p>
              <p className="truncate text-[11px] text-text-muted leading-tight mt-0.5">{email}</p>
            </div>
          </Link>
          <button
            type="button"
            onClick={() => signOut({ callbackUrl: "/login" })}
            aria-label="Sign out"
            className="shrink-0 flex h-8 w-8 items-center justify-center rounded-lg text-text-muted hover:bg-[var(--surface)] hover:text-text transition-colors"
          >
            <LogOut size={14} />
          </button>
        </div>
      </div>
    </aside>
  );
}

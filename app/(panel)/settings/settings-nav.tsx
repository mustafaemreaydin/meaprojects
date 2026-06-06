"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { UserRound, KeyRound, Palette, Wrench } from "lucide-react";
import { cn } from "@/lib/utils";

const ITEMS = [
  { href: "/settings/account", label: "Account", icon: UserRound },
  { href: "/settings/api-keys", label: "API Keys", icon: KeyRound, adminOnly: true },
  { href: "/settings", label: "Appearance", icon: Palette, exact: true, adminOnly: true },
  { href: "/settings/advanced", label: "Advanced", icon: Wrench, adminOnly: true },
];

export function SettingsNav({ isAdmin = false }: { isAdmin?: boolean }) {
  const pathname = usePathname();
  const items = ITEMS.filter((i) => isAdmin || !i.adminOnly);
  return (
    <nav>
      <ul className="flex flex-col gap-0.5">
        {items.map((item) => {
          const active = item.exact ? pathname === item.href : pathname.startsWith(item.href) && item.href !== "/settings";
          const Icon = item.icon;
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                className={cn(
                  "flex items-center gap-2.5 rounded-md px-2.5 py-2 text-[13.5px]",
                  active
                    ? "bg-ink-100 text-ink-900 dark:bg-ink-700 dark:text-paper-100"
                    : "text-text-muted hover:text-text hover:bg-paper-200 dark:hover:bg-ink-700"
                )}
              >
                <Icon size={14} /> {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

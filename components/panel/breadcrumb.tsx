"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { ChevronRight } from "lucide-react";

const LABELS: Record<string, string> = {
  dashboard: "Dashboard",
  tools: "Tools",
  upload: "Upload",
  run: "Run",
  logs: "Logs",
  settings: "Settings",
  "api-keys": "API Keys",
  account: "Account",
  docs: "Docs",
};

export function Breadcrumb() {
  const pathname = usePathname();
  const segments = pathname.split("/").filter(Boolean);

  if (segments.length === 0) return null;

  return (
    <nav aria-label="Location" className="flex items-center gap-1 text-[13px] text-text-muted">
      {segments.map((seg, i) => {
        const href = "/" + segments.slice(0, i + 1).join("/");
        const last = i === segments.length - 1;
        const label = LABELS[seg] ?? decodeURIComponent(seg);
        return (
          <span key={href} className="flex items-center gap-1">
            {i > 0 && <ChevronRight size={12} className="text-text-muted" />}
            {last ? (
              <span className="text-text">{label}</span>
            ) : (
              <Link href={href} className="hover:text-text">
                {label}
              </Link>
            )}
          </span>
        );
      })}
    </nav>
  );
}

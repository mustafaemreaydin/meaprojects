"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { useTheme } from "next-themes";

interface FeyButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  /** optional glyph before the label */
  icon?: React.ReactNode;
  /** force dark styling regardless of theme (e.g. on always-dark sections) */
  forceDark?: boolean;
  /** force light styling regardless of theme */
  forceLight?: boolean;
}

export function FeyButton({ className, children, icon, forceDark, forceLight, ...props }: FeyButtonProps) {
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => setMounted(true), []);

  // Default to dark to match SSR (theme provider default), avoids flash
  const isDark = forceDark ? true : forceLight ? false : mounted ? resolvedTheme !== "light" : true;

  return (
    <button
      className={cn(
        "group relative flex items-center justify-center gap-1.5",
        "h-11 whitespace-nowrap rounded-[28px] px-6",
        "text-[14px] font-medium leading-tight text-[var(--text)]",
        "transition-transform duration-150 active:scale-[0.98]",
        // Base radial gradient
        isDark
          ? "bg-[radial-gradient(61%_50%_at_50%_50%,#1a1a1a_0%,rgba(255,255,255,0.03)_100%)]"
          : "bg-[radial-gradient(61%_50%_at_50%_50%,#ffffff_0%,rgba(0,0,0,0.02)_100%)]",
        // Crisp inset border (Fey signature)
        isDark
          ? "[box-shadow:inset_0_0_0_0.5px_rgba(255,255,255,0.14),inset_1px_1px_0_-0.5px_rgba(255,255,255,0.28),inset_-1px_-1px_0_-0.5px_rgba(255,255,255,0.28)]"
          : "[box-shadow:inset_0_0_0_0.5px_rgba(0,0,0,0.12),inset_1px_1px_0_-0.5px_rgba(0,0,0,0.16),inset_-1px_-1px_0_-0.5px_rgba(0,0,0,0.16)]",
        // Hover layer
        "after:absolute after:inset-0 after:rounded-[28px] after:opacity-0 after:transition-opacity after:duration-200",
        isDark
          ? "after:bg-[radial-gradient(61%_50%_at_50%_50%,#000000_0%,#181818_100%)] after:[box-shadow:inset_0_0_0_0.5px_rgba(255,255,255,0.2),inset_1px_1px_0_-0.5px_rgba(255,255,255,0.35),inset_-1px_-1px_0_-0.5px_rgba(255,255,255,0.35),0_0_8px_rgba(255,255,255,0.12)]"
          : "after:bg-[radial-gradient(61%_50%_at_50%_50%,#ffffff_0%,#f2f2f2_100%)] after:[box-shadow:inset_0_0_0_0.5px_rgba(0,0,0,0.18),inset_1px_1px_0_-0.5px_rgba(0,0,0,0.22),inset_-1px_-1px_0_-0.5px_rgba(0,0,0,0.22),0_0_8px_rgba(0,0,0,0.10)]",
        "hover:after:opacity-100",
        "disabled:opacity-50 disabled:cursor-not-allowed",
        className
      )}
      {...props}
    >
      <span className="relative z-10 flex items-center gap-1.5">
        {icon}
        {children}
      </span>
    </button>
  );
}

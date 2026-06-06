"use client";

import { Toaster as SonnerToaster } from "sonner";
import { useTheme } from "next-themes";

export function Toaster() {
  const { resolvedTheme } = useTheme();
  return (
    <SonnerToaster
      theme={(resolvedTheme as "light" | "dark") ?? "light"}
      position="bottom-right"
      richColors={false}
      toastOptions={{
        classNames: {
          toast:
            "rounded-lg border border-ink-100 dark:border-ink-600 bg-[var(--surface)] text-text shadow",
          description: "text-text-muted",
          actionButton: "bg-mist-300 text-ink-900",
        },
      }}
    />
  );
}

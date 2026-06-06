import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10.5px] font-medium tracking-wider uppercase",
  {
    variants: {
      tone: {
        neutral: "bg-ink-100 text-ink-600 dark:bg-ink-700 dark:text-ink-300",
        accent:  "bg-ink-800 text-ink-200 dark:bg-ink-700 dark:text-ink-300",
        success: "bg-[color-mix(in_srgb,var(--success)_15%,transparent)] text-[var(--success)]",
        warning: "bg-[color-mix(in_srgb,var(--warning)_15%,transparent)] text-[var(--warning)]",
        danger:  "bg-[color-mix(in_srgb,var(--danger)_15%,transparent)] text-[var(--danger)]",
        outline: "border border-ink-200 text-ink-600 dark:border-ink-600 dark:text-ink-400",
      },
    },
    defaultVariants: { tone: "neutral" },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

export function Badge({ className, tone, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ tone }), className)} {...props} />;
}

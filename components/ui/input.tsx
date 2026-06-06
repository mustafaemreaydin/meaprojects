"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  invalid?: boolean;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, invalid, ...props }, ref) => (
    <input
      ref={ref}
      className={cn(
        "flex h-10 w-full rounded-lg border bg-[var(--surface)] px-3 py-2 text-[13.5px] text-text placeholder:text-text-muted",
        "transition-colors duration-150",
        "border-ink-200 dark:border-ink-600",
        "focus-visible:outline-none focus-visible:border-ink-500 focus-visible:ring-2 focus-visible:ring-ink-200 dark:focus-visible:border-ink-400 dark:focus-visible:ring-ink-700",
        invalid && "border-[var(--danger)] focus-visible:border-[var(--danger)] focus-visible:ring-[var(--danger)]/20",
        "disabled:opacity-50 disabled:cursor-not-allowed",
        className
      )}
      {...props}
    />
  )
);
Input.displayName = "Input";

export const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement> & { invalid?: boolean }
>(({ className, invalid, ...props }, ref) => (
  <textarea
    ref={ref}
    className={cn(
      "flex w-full min-h-[100px] rounded-lg border bg-[var(--surface)] px-3 py-2 text-[13.5px] text-text placeholder:text-text-muted resize-y",
      "transition-colors duration-150",
      "border-ink-200 dark:border-ink-600",
      "focus-visible:outline-none focus-visible:border-ink-500 focus-visible:ring-2 focus-visible:ring-ink-200 dark:focus-visible:border-ink-400 dark:focus-visible:ring-ink-700",
      invalid && "border-[var(--danger)] focus-visible:border-[var(--danger)] focus-visible:ring-[var(--danger)]/20",
      "disabled:opacity-50 disabled:cursor-not-allowed",
      className
    )}
    {...props}
  />
));
Textarea.displayName = "Textarea";

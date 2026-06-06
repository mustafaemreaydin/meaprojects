import { type ReactNode } from "react";
import { cn } from "@/lib/utils";

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}

export function EmptyState({ icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div
      className={cn(
        "mx-auto flex max-w-[420px] flex-col items-center text-center py-16",
        className
      )}
    >
      {icon && (
        <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-xl bg-mist-50 text-mist-500 dark:bg-ink-700">
          {icon}
        </div>
      )}
      <h2 className="text-h2 text-text">{title}</h2>
      {description && <p className="mt-2 text-[15px] text-text-muted leading-relaxed">{description}</p>}
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}

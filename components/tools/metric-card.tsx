import { Sparkline } from "./sparkline";
import { cn } from "@/lib/utils";

interface MetricCardProps {
  label: string;
  value: string | number;
  values?: number[];
  suffix?: string;
  className?: string;
}

export function MetricCard({ label, value, values = [], suffix, className }: MetricCardProps) {
  return (
    <div
      className={cn(
        "group flex flex-col justify-between gap-6 rounded-xl border border-ink-100 bg-[var(--surface)] p-5 dark:border-ink-700 dark:bg-ink-800",
        "transition-colors hover:border-ink-300 dark:hover:border-ink-600",
        className
      )}
    >
      <span className="text-[11.5px] font-medium uppercase tracking-widest text-text-muted">{label}</span>
      <div className="flex items-end justify-between gap-3">
        <div className="flex items-baseline gap-1.5">
          <span className="text-[32px] font-light tracking-tight text-text leading-none">{value}</span>
          {suffix && <span className="mb-0.5 text-[12px] text-text-muted">{suffix}</span>}
        </div>
        <Sparkline values={values} />
      </div>
    </div>
  );
}

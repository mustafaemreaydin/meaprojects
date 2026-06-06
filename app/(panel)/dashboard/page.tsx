import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight, ArrowUpRight, UploadCloud, KeyRound, Boxes, BookOpen } from "lucide-react";
import { getCurrentUser } from "@/lib/access";
import { prisma } from "@/lib/db";
import { MetricCard } from "@/components/tools/metric-card";
import { ToolCard } from "@/components/tools/tool-card";
import { FeyButton } from "@/components/ui/fey-button";
import { formatRelativeTime } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.role !== "admin") redirect("/apps"); // dashboard is the admin control panel
  const firstName = (user.name ?? "there").split(" ")[0];

  const now = new Date();
  const hour = now.getHours();
  const greeting = hour < 6 ? "Late night" : hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
  const dateLabel = now.toLocaleDateString("en-US", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const [toolCount, runsThisWeek, llmCallsThisWeek, totalCost, recentTools, recentRuns, recentCalls] =
    await Promise.all([
      prisma.tool.count(),
      prisma.toolRun.count({ where: { startedAt: { gte: sevenDaysAgo } } }),
      prisma.llmCall.findMany({
        where: { createdAt: { gte: sevenDaysAgo } },
        select: { inputTokens: true, outputTokens: true, createdAt: true, costUsd: true },
      }),
      prisma.llmCall.aggregate({ _sum: { costUsd: true } }),
      prisma.tool.findMany({ orderBy: { updatedAt: "desc" }, take: 5 }),
      prisma.toolRun.findMany({ orderBy: { startedAt: "desc" }, take: 7, include: { tool: true } }),
      prisma.llmCall.findMany({ orderBy: { createdAt: "desc" }, take: 8 }),
    ]);

  const tokenTotal = llmCallsThisWeek.reduce((acc, c) => acc + c.inputTokens + c.outputTokens, 0);
  const tokenSparkline = buildDailySeries(llmCallsThisWeek.map((c) => c.createdAt));
  const runSparkline = buildDailySeries(recentRuns.map((r) => r.startedAt));
  const callSparkline = buildDailySeries(llmCallsThisWeek.map((c) => c.createdAt));

  return (
    <div className="flex flex-col gap-12">
      {/* ── Header ─────────────────────────────────────────── */}
      <header className="flex flex-col gap-6 border-b border-[var(--border)] pb-10 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="mb-3 text-[11px] font-medium uppercase tracking-[0.18em] text-text-muted">
            {dateLabel}
          </p>
          <h1 className="text-[clamp(34px,5vw,52px)] font-light leading-none tracking-[-0.04em] text-text">
            {greeting}, {firstName}.
          </h1>
          <p className="mt-4 max-w-md text-[14px] font-light leading-relaxed text-text-muted">
            A quick look at your workspace — installed tools, usage and recent activity.
          </p>
        </div>
        <Link href="/tools/upload" className="shrink-0">
          <FeyButton className="h-10 px-6">
            <UploadCloud size={15} /> Upload tool
          </FeyButton>
        </Link>
      </header>

      {/* ── Metrics ────────────────────────────────────────── */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          label="Installed Tools"
          value={toolCount}
          values={Array.from({ length: 7 }, () => toolCount)}
        />
        <MetricCard label="Runs This Week" value={runsThisWeek} values={runSparkline} />
        <MetricCard
          label="Token Usage"
          value={formatTokens(tokenTotal)}
          suffix="this week"
          values={tokenSparkline}
        />
        <MetricCard
          label="Total Cost"
          value={totalCost._sum.costUsd ? `$${(totalCost._sum.costUsd ?? 0).toFixed(2)}` : "$0.00"}
          values={callSparkline}
        />
      </div>

      {/* ── Main split ─────────────────────────────────────── */}
      <div className="grid grid-cols-1 gap-10 lg:grid-cols-[3fr_2fr]">
        {/* Recently used */}
        <section className="flex flex-col gap-5">
          <SectionHeader label="Recently used" href="/tools" cta="All tools" />
          {recentTools.length === 0 ? (
            <EmptyBox icon={<Boxes size={18} />}>
              No tools installed yet. Upload your first one and it will appear here.
            </EmptyBox>
          ) : (
            <ul className="flex flex-col gap-2.5">
              {recentTools.map((t) => (
                <li key={t.id}>
                  <ToolCard item={t} />
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Quick actions */}
        <aside className="flex flex-col gap-5">
          <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-text-muted">Quick actions</p>
          <ul className="flex flex-col gap-2.5">
            <QuickAction href="/tools/upload" icon={<UploadCloud size={16} />} title="Upload new tool" desc="Install a packaged tool" />
            <QuickAction href="/settings/api-keys" icon={<KeyRound size={16} />} title="Add API key" desc="Connect an LLM provider" />
            <QuickAction href="/docs" icon={<BookOpen size={16} />} title="Read the docs" desc="Manifest & bridge reference" />
          </ul>
        </aside>
      </div>

      {/* ── Recent activity ────────────────────────────────── */}
      <section className="flex flex-col gap-5">
        <SectionHeader label="Recent activity" href="/logs" cta="All logs" />
        {recentCalls.length === 0 ? (
          <EmptyBox>No LLM calls yet. Run a tool that calls a model and it will appear here.</EmptyBox>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] dark:bg-ink-800">
            <ol>
              {recentCalls.map((c, i) => (
                <li
                  key={c.id}
                  className={`group flex items-center gap-4 px-5 py-3.5 text-[12.5px] transition-colors hover:bg-[var(--bg-elevated)] ${
                    i !== recentCalls.length - 1 ? "border-b border-[var(--border)]" : ""
                  }`}
                >
                  <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-ink-300 dark:bg-ink-500" />
                  <span className="w-20 shrink-0 text-text-muted">{formatRelativeTime(c.createdAt)}</span>
                  <span className="shrink-0 font-medium text-text">{c.provider}</span>
                  <span className="shrink-0 font-mono text-[11.5px] text-text-muted">{c.model}</span>
                  {c.toolSlug && (
                    <span className="ml-auto truncate font-mono text-[11.5px] text-text-muted">{c.toolSlug}</span>
                  )}
                  <span className="shrink-0 tabular-nums text-text-muted">
                    {c.inputTokens + c.outputTokens} tok
                  </span>
                </li>
              ))}
            </ol>
          </div>
        )}
      </section>
    </div>
  );
}

function SectionHeader({ label, href, cta }: { label: string; href: string; cta: string }) {
  return (
    <div className="flex items-center justify-between">
      <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-text-muted">{label}</p>
      <Link
        href={href}
        className="group flex items-center gap-1 text-[12px] text-text-muted transition-colors hover:text-text"
      >
        {cta}
        <ArrowRight size={11} className="transition-transform group-hover:translate-x-0.5" />
      </Link>
    </div>
  );
}

function EmptyBox({ children, icon }: { children: React.ReactNode; icon?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-[var(--border)] px-6 py-12 text-center">
      {icon && (
        <span className="flex h-10 w-10 items-center justify-center rounded-full border border-[var(--border)] text-text-muted">
          {icon}
        </span>
      )}
      <p className="max-w-[280px] text-[13.5px] text-text-muted">{children}</p>
    </div>
  );
}

function QuickAction({
  href,
  icon,
  title,
  desc,
}: {
  href: string;
  icon: React.ReactNode;
  title: string;
  desc: string;
}) {
  return (
    <li>
      <Link
        href={href}
        className="group flex items-center gap-3.5 rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3.5 transition-colors hover:border-ink-300 dark:bg-ink-800 dark:hover:border-ink-500"
      >
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--bg-elevated)] text-text-muted transition-colors group-hover:text-text">
          {icon}
        </span>
        <span className="flex-1">
          <span className="block text-[13.5px] font-medium text-text">{title}</span>
          <span className="block text-[12px] text-text-muted">{desc}</span>
        </span>
        <ArrowUpRight size={15} className="text-text-muted transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
      </Link>
    </li>
  );
}

function formatTokens(n: number): string {
  if (n < 1000) return String(n);
  if (n < 1_000_000) return (n / 1000).toFixed(1).replace(/\.0$/, "") + "K";
  return (n / 1_000_000).toFixed(2).replace(/\.00$/, "") + "M";
}

function buildDailySeries(dates: Date[]): number[] {
  const days = 7;
  const buckets = Array(days).fill(0);
  const now = Date.now();
  for (const d of dates) {
    const diffDays = Math.floor((now - d.getTime()) / (24 * 60 * 60 * 1000));
    if (diffDays >= 0 && diffDays < days) buckets[days - 1 - diffDays] += 1;
  }
  return buckets;
}

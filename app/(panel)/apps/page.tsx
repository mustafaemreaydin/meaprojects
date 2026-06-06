import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight, Boxes, Globe, Lock } from "lucide-react";
import { getCurrentUser, listAccessibleTools } from "@/lib/access";
import { FeyButton } from "@/components/ui/fey-button";
import { EmptyState } from "@/components/ui/empty-state";

export const dynamic = "force-dynamic";

const APEX = process.env.NEXT_PUBLIC_APP_DOMAIN; // e.g. "meaprojects.com" (optional)

export default async function AppsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const tools = await listAccessibleTools(user);
  const runnable = tools.filter((t) => t.status === "installed" && t.type !== "backend");

  return (
    <div className="flex flex-col gap-10">
      <header>
        <p className="mb-3 text-[11px] font-medium uppercase tracking-[0.18em] text-text-muted">
          Your tools
        </p>
        <h1 className="text-[clamp(30px,4.5vw,48px)] font-light leading-none tracking-[-0.04em] text-text">
          {user.role === "admin" ? "Tool library" : `Welcome, ${(user.name ?? "there").split(" ")[0]}.`}
        </h1>
        <p className="mt-4 max-w-md text-[14px] font-light leading-relaxed text-text-muted">
          {user.role === "admin"
            ? "Every installed tool. Open one to run it, or manage access from Users."
            : "The tools you have access to. Open one to start."}
        </p>
      </header>

      {runnable.length === 0 ? (
        <EmptyState
          icon={<Boxes size={20} />}
          title={user.role === "admin" ? "No runnable tools yet." : "No tools yet."}
          description={
            user.role === "admin"
              ? "Upload a static or SPA tool to see it here."
              : "You don't have access to any tools yet. Ask the owner to grant you one."
          }
        />
      ) : (
        <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {runnable.map((t) => {
            const subdomainUrl = APEX ? `https://${t.slug}.${APEX}` : null;
            return (
              <li
                key={t.id}
                className="group flex flex-col gap-4 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 transition-colors hover:border-ink-300 dark:bg-ink-800 dark:hover:border-ink-500"
              >
                <div className="flex items-start justify-between">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[var(--bg-elevated)] text-[16px] font-semibold text-text">
                    {t.name.slice(0, 1).toUpperCase()}
                  </div>
                  <span className="flex items-center gap-1 text-[10.5px] uppercase tracking-wider text-text-muted">
                    {t.access === "public" ? <Globe size={11} /> : <Lock size={11} />}
                    {t.access}
                  </span>
                </div>
                <div className="flex-1">
                  <p className="text-[15px] font-medium text-text">{t.name}</p>
                  {t.description && (
                    <p className="mt-1 line-clamp-2 text-[12.5px] leading-relaxed text-text-muted">
                      {t.description}
                    </p>
                  )}
                  <p className="mt-2 font-mono text-[11px] text-text-muted">v{t.version} · {t.slug}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Link href={`/tools/${t.slug}/run`} className="flex-1">
                    <FeyButton className="h-10 w-full">
                      Open <ArrowRight size={14} />
                    </FeyButton>
                  </Link>
                  {subdomainUrl && (
                    <a
                      href={subdomainUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      title={`${t.slug}.${APEX}`}
                      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[var(--border)] text-text-muted transition-colors hover:text-text hover:border-ink-400"
                    >
                      <Globe size={15} />
                    </a>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

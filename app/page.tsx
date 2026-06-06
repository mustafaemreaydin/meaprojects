import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { Logo } from "@/components/shared/logo";
import { DottedSurface } from "@/components/ui/dotted-surface";
import { DotFlow } from "@/components/ui/dot-flow";
import { FeyButton } from "@/components/ui/fey-button";
import { ContactForm } from "./contact-form";
import {
  Boxes, Zap, KeyRound, UploadCloud, ShieldCheck, ArrowRight, Activity, Mail,
} from "lucide-react";

/* ── animation frames ──────────────────────────────────── */
const installing = [
  [0,2,4,6,20,34,48,46,44,42,28,14],[8,22,36,38,40,26,12,10,16,30,24,18,32],
  [9,11,15,17,19,23,25,29,31],[16,30,24,18,32],[17,23,31,25],[24],
  [17,23,31,25],[16,30,24,18,32],[9,11,15,17,19,23,25,29,31],
  [8,22,36,38,40,26,12,10,16,30,24,18,32],[0,2,4,6,20,34,48,46,44,42,28,14],
];
const syncing = [
  [45,38,31,24,17,23,25],[38,31,24,17,10,16,18],[31,24,17,10,3,9,11],
  [24,17,10,3,2,4],[17,10,3],[10,3],[3],[],
  [45],[45,38,44,46],[45,38,31,37,39],[45,38,31,24,30,32],
];
const searching = [
  [9,16,17,15,23],[10,17,18,16,24],[11,18,19,17,25],[18,25,26,24,32],
  [25,32,33,31,39],[32,39,40,38,46],[31,38,39,37,45],[30,37,38,36,44],
  [23,30,31,29,37],[16,23,24,22,30],
];
const encrypting = [
  [],[3],[10,2,4,3],[17,9,11,5,10,4,3],[24,16,1,3,12,17,11,10,9],
  [31,23,8,10,4,19,18,16],[38,30,15,9,11,25,24,17],[38,30,15,9,11,25,24,17],
  [39,37,30,22,16,23,31,25,18],[17,24,31,25,18],[24],
];
const dotFlowItems = [
  { title: "Installing tool...",  frames: installing,  duration: 160, repeatCount: 1 },
  { title: "Running model...",    frames: syncing,     duration: 100, repeatCount: 2 },
  { title: "Logging calls...",    frames: searching,   duration: 130, repeatCount: 2 },
  { title: "Encrypting keys...",  frames: encrypting,  duration: 110, repeatCount: 2 },
];

export default async function LandingPage() {
  const session = await getServerSession(authOptions);
  const isLoggedIn = !!session?.user;
  const role = (session?.user as { role?: string } | undefined)?.role;
  const homeHref = role === "admin" ? "/dashboard" : "/apps";

  return (
    <div
      className="min-h-screen bg-[var(--bg)] text-[var(--text)]"
      style={{ fontFamily: "'Anta Trial', sans-serif" }}
    >
      {/* ── NAV ─────────────────────────────────────────────── */}
      <header className="sticky top-0 z-50 border-b border-[var(--border)] bg-[var(--bg)]/80 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-6">
          <Logo size="lg" className="mt-1" />
          <nav className="hidden md:flex items-center gap-8 text-[13px] text-[var(--text-muted)]">
            <a href="#features"     className="hover:text-[var(--text)] transition-colors">Features</a>
            <a href="#how-it-works" className="hover:text-[var(--text)] transition-colors">How it works</a>
            <a href="#contact"      className="hover:text-[var(--text)] transition-colors">Contact</a>
            <Link href="/docs"      className="hover:text-[var(--text)] transition-colors">Docs</Link>
          </nav>
          {isLoggedIn ? (
            <Link href={homeHref}>
              <FeyButton className="h-9 px-5 text-[13px]">
                {role === "admin" ? "Dashboard" : "My tools"} <ArrowRight size={13} />
              </FeyButton>
            </Link>
          ) : (
            <Link href="/login">
              <FeyButton className="h-9 px-5 text-[13px]">
                Sign in <ArrowRight size={13} />
              </FeyButton>
            </Link>
          )}
        </div>
      </header>

      {/* ── HERO ────────────────────────────────────────────── */}
      <section className="relative overflow-hidden border-b border-[var(--border)]">
        {/* Three.js animated background — contained within hero */}
        <DottedSurface className="absolute inset-0 w-full h-full" />

        <div className="relative z-10 mx-auto max-w-6xl px-6 pt-10 pb-16 md:pt-12 md:pb-20">
          {/* Live status pill */}
          <div className="mb-8">
            <DotFlow items={dotFlowItems} />
          </div>

          <p className="mb-4 text-[11px] font-medium uppercase tracking-[0.18em] text-[var(--text-muted)]">
            meaprojects.com
          </p>

          <h1 className="max-w-2xl text-[clamp(44px,7vw,86px)] font-light leading-[0.98] tracking-[-0.05em] text-[var(--text)]">
            My personal<br />AI workspace.
          </h1>

          <p className="mt-6 max-w-md text-[15px] font-light leading-relaxed text-[var(--text-muted)]">
            Build, manage and run AI tools from a single self-hosted panel.
            Full control over your models, keys, and data.
          </p>

          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Link href="/login">
              <FeyButton className="h-11 px-7">
                Get started <ArrowRight size={14} />
              </FeyButton>
            </Link>
            <Link
              href="/docs"
              className="inline-flex items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--surface)]/70 backdrop-blur-sm px-6 h-11 text-[14px] font-medium text-[var(--text)] transition-colors hover:border-ink-400"
            >
              Read docs
            </Link>
          </div>

          {/* Stats */}
          <div className="mt-14 flex flex-wrap gap-10 border-t border-[var(--border)] pt-8">
            {[
              { n: "100%", label: "Self-hosted" },
              { n: "3+",   label: "LLM providers" },
              { n: "∞",    label: "Tools" },
            ].map(({ n, label }) => (
              <div key={label}>
                <p className="text-[34px] font-light tracking-tight text-[var(--text)] leading-none">{n}</p>
                <p className="mt-1 text-[10px] uppercase tracking-widest text-[var(--text-muted)]">{label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── TRUST BAR ───────────────────────────────────────── */}
      <section className="border-b border-[var(--border)] bg-[var(--bg-elevated)]">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-4 px-6 py-4">
          <span className="text-[10.5px] uppercase tracking-widest text-[var(--text-muted)]">Works with</span>
          <div className="flex gap-2">
            {["Anthropic", "OpenAI", "Google"].map((name) => (
              <span key={name} className="rounded-full border border-[var(--border)] px-4 py-1 text-[12px] font-medium text-[var(--text-muted)]">
                {name}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ── FEATURES ────────────────────────────────────────── */}
      <section id="features" className="border-b border-[var(--border)]">
        <div className="mx-auto max-w-6xl px-6 py-20">
          <p className="mb-3 text-[10.5px] font-medium uppercase tracking-[0.18em] text-[var(--text-muted)]">Features</p>
          <h2 className="mb-12 max-w-lg text-[clamp(26px,4vw,40px)] font-light leading-tight tracking-[-0.03em] text-[var(--text)]">
            Everything you need,<br />nothing you don't.
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-px bg-[var(--border)] rounded-2xl overflow-hidden border border-[var(--border)]">
            {[
              { icon: <Boxes size={16} />,      title: "Tool Library",     desc: "Install, update and organise tools as versioned zip packages." },
              { icon: <Zap size={16} />,         title: "LLM Bridge",       desc: "Route requests to Anthropic, OpenAI or Google without embedding credentials in each tool." },
              { icon: <KeyRound size={16} />,    title: "API Keys & Logs",  desc: "AES-256 encrypted key storage. Every call logged with token counts and cost." },
              { icon: <ShieldCheck size={16} />, title: "Permissions",      desc: "Tools declare what they need. You approve at install time — nothing runs silently." },
              { icon: <Activity size={16} />,    title: "Usage Metrics",    desc: "Weekly run counts, token usage and cost roll-ups across all providers." },
              { icon: <UploadCloud size={16} />, title: "One-click Install", desc: "Drag and drop to install. Manifest validation runs before anything touches your system." },
            ].map(({ icon, title, desc }) => (
              <div
                key={title}
                className="group flex flex-col gap-4 bg-[var(--surface)] p-7 transition-colors hover:bg-[var(--bg-elevated)]"
              >
                <span className="flex h-9 w-9 items-center justify-center rounded-lg border border-[var(--border)] text-[var(--text-muted)] transition-colors group-hover:text-[var(--text)] group-hover:border-ink-400">
                  {icon}
                </span>
                <div>
                  <p className="text-[14px] font-medium text-[var(--text)] mb-1">{title}</p>
                  <p className="text-[12.5px] leading-relaxed text-[var(--text-muted)]">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ────────────────────────────────────── */}
      <section id="how-it-works" className="border-b border-[var(--border)] bg-[var(--bg-elevated)]">
        <div className="mx-auto max-w-6xl px-6 py-20">
          <p className="mb-3 text-[10.5px] font-medium uppercase tracking-[0.18em] text-[var(--text-muted)]">How it works</p>
          <h2 className="mb-14 max-w-md text-[clamp(26px,4vw,40px)] font-light leading-tight tracking-[-0.03em] text-[var(--text)]">
            From zip to running<br />in three steps.
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-12">
            {[
              { n: "01", icon: <UploadCloud size={18} />, title: "Upload a zip",        desc: "Package your tool with a tool.json manifest and drop it into the panel. No build step, no registry." },
              { n: "02", icon: <ShieldCheck size={18} />, title: "Approve permissions", desc: "Review exactly what the tool wants — LLM calls, storage, network. Approve or cancel." },
              { n: "03", icon: <Zap size={18} />,         title: "Run from the panel",  desc: "Open it in the immersive runner. The bridge proxies model calls through your stored keys." },
            ].map(({ n, icon, title, desc }) => (
              <div key={n} className="relative flex flex-col gap-4">
                <span aria-hidden className="absolute right-0 top-0 select-none font-light text-[var(--text)] opacity-[0.06]"
                  style={{ fontSize: 72, lineHeight: 1, letterSpacing: "-0.05em" }}>
                  {n}
                </span>
                <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-[var(--border)] bg-[var(--surface)] text-[var(--text-muted)]">
                  {icon}
                </div>
                <div>
                  <p className="text-[10.5px] font-medium uppercase tracking-widest text-[var(--text-muted)] mb-1.5">{n}</p>
                  <p className="text-[16px] font-medium text-[var(--text)]">{title}</p>
                  <p className="mt-1.5 text-[13px] leading-relaxed text-[var(--text-muted)]">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA BANNER ──────────────────────────────────────── */}
      <section className="relative overflow-hidden border-b border-ink-700 bg-ink-900 dark:bg-[#0a0a0a]">
        {/* Static dot-grid texture */}
        <div className="absolute inset-0 dot-grid opacity-60" aria-hidden />
        <div className="relative z-10 mx-auto flex max-w-6xl flex-col items-start gap-8 px-6 py-20 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="mb-3 text-[10.5px] font-medium uppercase tracking-[0.18em] text-ink-500">Get started</p>
            <h2 className="text-[clamp(30px,5vw,54px)] font-light leading-tight tracking-[-0.04em] text-paper-50">
              Ready to build?
            </h2>
            <p className="mt-3 max-w-sm text-[14px] font-light leading-relaxed text-ink-400">
              Self-hosted, private, yours. Deploy once and use forever.
            </p>
          </div>
          <div className="flex shrink-0 flex-col gap-3 sm:flex-row">
            <Link href="/login">
              <FeyButton forceDark className="h-11 px-8 text-paper-50">
                Sign in <ArrowRight size={14} />
              </FeyButton>
            </Link>
            <Link
              href="/docs"
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-ink-600 h-11 px-7 text-[14px] font-medium text-ink-300 transition-colors hover:border-ink-400 hover:text-paper-100"
            >
              Read docs
            </Link>
          </div>
        </div>
      </section>

      {/* ── CONTACT ─────────────────────────────────────────── */}
      <section id="contact" className="border-b border-[var(--border)]">
        <div className="mx-auto max-w-6xl px-6 py-24">
          <div className="grid grid-cols-1 gap-10 lg:grid-cols-[1fr_1.2fr]">
            <div>
              <p className="mb-3 text-[10.5px] font-medium uppercase tracking-[0.18em] text-[var(--text-muted)]">Contact</p>
              <h2 className="max-w-sm text-[clamp(26px,4vw,40px)] font-light leading-tight tracking-[-0.03em] text-[var(--text)]">
                Want to try a tool,<br />or build one together?
              </h2>
              <p className="mt-5 max-w-sm text-[14px] font-light leading-relaxed text-[var(--text-muted)]">
                meaprojects.com is my personal AI lab. If you&apos;d like access to one of my tools
                or have an idea worth prototyping, drop a note.
              </p>
              <a
                href="mailto:mustafaemreaydin@yandex.com"
                className="mt-6 inline-flex items-center gap-2 text-[13px] text-text-muted transition-colors hover:text-text"
              >
                <Mail size={14} /> mustafaemreaydin@yandex.com
              </a>
            </div>
            <div>
              <ContactForm />
            </div>
          </div>
        </div>
      </section>

      {/* ── FOOTER ──────────────────────────────────────────── */}
      <footer className="border-t border-[var(--border)] bg-[var(--bg-elevated)]">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-6 py-8 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3">
            <Logo size="sm" />
            <span className="text-[12px] text-[var(--text-muted)]">© {new Date().getFullYear()} meaprojects.com</span>
          </div>
          <nav className="flex flex-wrap items-center gap-6 text-[12px] text-[var(--text-muted)]">
            <Link href="/login" className="hover:text-[var(--text)] transition-colors">Sign in</Link>
            <Link href="/docs"  className="hover:text-[var(--text)] transition-colors">Docs</Link>
            <a href="#contact" className="hover:text-[var(--text)] transition-colors">Contact</a>
            <span className="text-[var(--text-muted)]/60">
              Built by{" "}
              <a
                href="mailto:mustafaemreaydin@yandex.com"
                className="text-[var(--text-muted)] underline-offset-4 hover:text-text hover:underline"
              >
                Mustafa Emre Aydın
              </a>
            </span>
          </nav>
        </div>
      </footer>
    </div>
  );
}

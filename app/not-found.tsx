import Link from "next/link";
import { Logo } from "@/components/shared/logo";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-[var(--bg)] px-6 text-center text-text">
      <Logo size="lg" />
      <p className="text-[64px] font-light leading-none tracking-tight text-text-muted">404</p>
      <div>
        <h1 className="text-[24px] font-light tracking-tight text-text">Page not found</h1>
        <p className="mt-2 max-w-sm text-[14px] text-text-muted">
          The page you&apos;re looking for doesn&apos;t exist or has moved.
        </p>
      </div>
      <Link
        href="/"
        className="inline-flex h-10 items-center rounded-xl border border-[var(--border)] px-5 text-[13.5px] text-text transition-colors hover:border-ink-400"
      >
        Back to home
      </Link>
    </div>
  );
}

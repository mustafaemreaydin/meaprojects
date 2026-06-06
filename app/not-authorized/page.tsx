import Link from "next/link";
import { Lock } from "lucide-react";
import { Logo } from "@/components/shared/logo";

export default function NotAuthorizedPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-[var(--bg)] px-6 text-center text-text">
      <Logo size="lg" />
      <span className="flex h-12 w-12 items-center justify-center rounded-full border border-[var(--border)] text-text-muted">
        <Lock size={20} />
      </span>
      <div>
        <h1 className="text-[28px] font-light tracking-tight text-text">Access not granted</h1>
        <p className="mt-2 max-w-sm text-[14px] text-text-muted">
          You don&apos;t have permission to use this tool. If you think this is a mistake,
          ask the workspace owner to grant you access.
        </p>
      </div>
      <div className="flex items-center gap-3">
        <Link
          href="/apps"
          className="inline-flex h-10 items-center rounded-xl border border-[var(--border)] px-5 text-[13.5px] text-text transition-colors hover:border-ink-400"
        >
          Back to your tools
        </Link>
        <a
          href="mailto:mustafaemreaydin@yandex.com"
          className="text-[13px] text-text-muted underline-offset-4 hover:text-text hover:underline"
        >
          Request access
        </a>
      </div>
    </div>
  );
}

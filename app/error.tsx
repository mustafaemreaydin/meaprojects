"use client";

import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Surface to monitoring in production if wired up later.
    console.error(error);
  }, [error]);

  return (
    <div
      className="flex min-h-screen flex-col items-center justify-center gap-6 bg-[var(--bg)] px-6 text-center text-text"
      style={{ fontFamily: "'Anta Trial', sans-serif" }}
    >
      <span
        className="text-[28px] font-light tracking-tight"
        style={{ fontFamily: "'Anta Trial', sans-serif", letterSpacing: "-0.04em" }}
      >
        mea
      </span>
      <div>
        <h1 className="text-[24px] font-light tracking-tight text-text">Something went wrong</h1>
        <p className="mt-2 max-w-sm text-[14px] text-text-muted">
          An unexpected error occurred. Try again, and if it persists, let me know.
        </p>
      </div>
      <div className="flex items-center gap-3">
        <button
          onClick={reset}
          className="inline-flex h-10 items-center rounded-xl bg-ink-900 px-5 text-[13.5px] font-medium text-paper-50 transition-opacity hover:opacity-85 dark:bg-paper-50 dark:text-ink-900"
        >
          Try again
        </button>
        <a
          href="mailto:mustafaemreaydin@yandex.com"
          className="text-[13px] text-text-muted underline-offset-4 hover:text-text hover:underline"
        >
          Report
        </a>
      </div>
    </div>
  );
}

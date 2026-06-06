"use client";

import * as React from "react";
import { Check } from "lucide-react";
import { FeyButton } from "@/components/ui/fey-button";
import { Spinner } from "@/components/ui/spinner";

export function ContactForm() {
  const [state, setState] = React.useState<"idle" | "sending" | "done" | "error">("idle");
  const [error, setError] = React.useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.currentTarget);
    const payload = {
      name: String(fd.get("name") ?? ""),
      email: String(fd.get("email") ?? ""),
      message: String(fd.get("message") ?? ""),
    };
    setState("sending");
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setState("error");
        setError(data.error ?? "Could not send. Please try again.");
        return;
      }
      setState("done");
    } catch {
      setState("error");
      setError("Network error. Please try again.");
    }
  }

  if (state === "done") {
    return (
      <div className="flex flex-col items-center gap-3 rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-6 py-12 text-center">
        <span className="flex h-10 w-10 items-center justify-center rounded-full border border-[var(--border)] text-[var(--text)]">
          <Check size={18} />
        </span>
        <p className="text-[15px] font-medium text-text">Thanks — your message is in.</p>
        <p className="text-[13px] text-text-muted">I&apos;ll get back to you at the email you provided.</p>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-3">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <input
          name="name"
          required
          placeholder="Your name"
          className="h-11 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 text-[14px] text-text placeholder:text-text-muted focus-visible:outline-none focus-visible:border-ink-500"
        />
        <input
          name="email"
          type="email"
          required
          placeholder="you@example.com"
          className="h-11 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 text-[14px] text-text placeholder:text-text-muted focus-visible:outline-none focus-visible:border-ink-500"
        />
      </div>
      <textarea
        name="message"
        required
        rows={4}
        placeholder="What would you like to build or try?"
        className="rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3 text-[14px] text-text placeholder:text-text-muted resize-y focus-visible:outline-none focus-visible:border-ink-500"
      />
      {error && <p className="text-[13px] text-[var(--danger)]">{error}</p>}
      <div className="flex items-center justify-between gap-4">
        <a
          href="mailto:mustafaemreaydin@yandex.com"
          className="text-[13px] text-text-muted underline-offset-4 hover:text-text hover:underline"
        >
          or email me directly
        </a>
        <FeyButton type="submit" disabled={state === "sending"} className="h-11 px-7">
          {state === "sending" ? (
            <>
              <Spinner size={14} /> Sending…
            </>
          ) : (
            "Send message"
          )}
        </FeyButton>
      </div>
    </form>
  );
}

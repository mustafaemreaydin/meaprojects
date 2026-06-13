"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowLeft, Maximize2, Minimize2, X } from "lucide-react";
import { BridgeRelay } from "@/components/panel/bridge-relay";

interface ToolRunnerProps {
  slug: string;
  name: string;
  entry: string;
  userName: string;
  userId: string;
  /** Subdomain modunda header gösterilmez; tool tam ekran çalışır. */
  standalone?: boolean;
}

export function ToolRunner({ slug, name, entry, standalone = false }: ToolRunnerProps) {
  const iframeRef = React.useRef<HTMLIFrameElement>(null);
  const [fullscreen, setFullscreen] = React.useState(false);
  const [ready, setReady] = React.useState(false);

  // Tool dosyalarını panel'in serve eden endpoint'inden yükle.
  const src = `/api/tools/${slug}/file/${entry}`;

  // Standalone (subdomain) modunda tool tam ekran, header yok.
  if (standalone) {
    return (
      <div className="flex h-screen w-screen flex-col">
        <iframe
          ref={iframeRef}
          src={src}
          title={name}
          sandbox="allow-scripts allow-forms allow-popups allow-downloads"
          className="flex-1 w-full border-none"
        />
        <BridgeRelay iframeRef={iframeRef} toolSlug={slug} onReady={() => setReady(true)} />
      </div>
    );
  }

  return (
    <div className="flex h-screen w-screen flex-col bg-[var(--bg)]">
      {!fullscreen && (
        <div className="flex h-10 shrink-0 items-center justify-between gap-3 border-b border-ink-100 bg-[var(--bg-elevated)] px-3 dark:border-ink-700">
          <div className="flex items-center gap-2">
            <Link
              href={`/tools/${slug}`}
              className="flex h-7 w-7 items-center justify-center rounded-md text-text-muted hover:bg-paper-200 dark:hover:bg-ink-700"
              aria-label="Geri"
            >
              <ArrowLeft size={14} />
            </Link>
            <span className="text-[13px] font-medium text-text">{name}</span>
            {!ready && <span className="text-[12px] text-text-muted">bağlanıyor…</span>}
          </div>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setFullscreen(true)}
              className="flex h-7 w-7 items-center justify-center rounded-md text-text-muted hover:bg-paper-200 dark:hover:bg-ink-700"
              aria-label="Tam ekran"
            >
              <Maximize2 size={14} />
            </button>
            <Link
              href={`/tools/${slug}`}
              className="flex h-7 w-7 items-center justify-center rounded-md text-text-muted hover:bg-paper-200 dark:hover:bg-ink-700"
              aria-label="Kapat"
            >
              <X size={14} />
            </Link>
          </div>
        </div>
      )}

      <iframe
        ref={iframeRef}
        src={src}
        title={name}
        sandbox="allow-scripts allow-forms allow-popups allow-downloads"
        className="flex-1 w-full bg-white"
      />

      {fullscreen && (
        <button
          type="button"
          onClick={() => setFullscreen(false)}
          className="fixed right-4 top-4 z-40 flex h-9 w-9 items-center justify-center rounded-full border border-ink-100 bg-[var(--surface)] text-text-muted shadow hover:text-text dark:border-ink-600"
          aria-label="Tam ekrandan çık"
        >
          <Minimize2 size={15} />
        </button>
      )}

      <BridgeRelay iframeRef={iframeRef} toolSlug={slug} onReady={() => setReady(true)} />
    </div>
  );
}

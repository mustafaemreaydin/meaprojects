"use client";

/**
 * Panel-side bridge relay.
 *
 * Tool iframe'lerinden gelen `postMessage` isteklerini yakalayıp uygun
 * `/api/bridge/*` endpoint'lerine proxy'ler, sonucu iframe'e geri gönderir.
 *
 * Bu komponent yalnızca tool runner sayfasından kullanılır; her sayfada
 * mount edilmez. iframeRef ile hedef iframe'e bağlanır, origin doğrulaması
 * `window.location.origin` üzerinden yapılır.
 */

import * as React from "react";
import { toast } from "sonner";
import { useTheme } from "next-themes";

export interface BridgeRelayProps {
  iframeRef: React.RefObject<HTMLIFrameElement>;
  toolSlug: string;
  onReady?: () => void;
}

type BridgeKind = "request" | "event-emit" | "ui.toast" | "ready";
interface BridgeMessage {
  __meaprojects__: true;
  kind: BridgeKind;
  id?: string;
  channel?: string;
  payload?: unknown;
  name?: string;
  toolSlug?: string;
}

interface ConfirmDialog {
  title: string;
  message: string;
}

export function BridgeRelay({ iframeRef, toolSlug, onReady }: BridgeRelayProps) {
  const { resolvedTheme } = useTheme();
  const readyRef = React.useRef(false);

  // ui.confirm modal state
  const [confirmDialog, setConfirmDialog] = React.useState<ConfirmDialog | null>(null);
  const confirmResolveRef = React.useRef<((v: boolean) => void) | null>(null);

  const showConfirmDialog = React.useCallback(
    (p: { title?: string; message?: string }): Promise<boolean> =>
      new Promise((resolve) => {
        confirmResolveRef.current = resolve;
        setConfirmDialog({ title: p.title ?? "Onay", message: p.message ?? "" });
      }),
    []
  );

  const handleConfirmAnswer = React.useCallback((answer: boolean) => {
    setConfirmDialog(null);
    confirmResolveRef.current?.(answer);
    confirmResolveRef.current = null;
  }, []);

  const postTheme = React.useCallback(
    (theme: string) => {
      // İframe `allow-same-origin` olmadan sandbox'landığı için origin'i opak
      // ("null"); panel origin'i ile hedeflenemez. Hedef pencere zaten yalnızca
      // bizim iframe contentWindow'umuz olduğundan "*" güvenli.
      iframeRef.current?.contentWindow?.postMessage(
        { __meaprojects__: true, kind: "event", name: "theme", payload: { theme } },
        "*"
      );
    },
    [iframeRef]
  );

  // Global cross-tool event bus: forward any meaprojects:tool-event to this iframe.
  // Each BridgeRelay instance listens here, so events reach ALL open tools.
  React.useEffect(() => {
    const handleGlobalEvent = (e: Event) => {
      const { name, payload } = (e as CustomEvent<{ source: string; name: string; payload: unknown }>).detail;
      iframeRef.current?.contentWindow?.postMessage(
        { __meaprojects__: true, kind: "event", name, payload },
        "*"
      );
    };
    window.addEventListener("meaprojects:tool-event", handleGlobalEvent);
    return () => window.removeEventListener("meaprojects:tool-event", handleGlobalEvent);
  }, [iframeRef]);

  // Push theme changes to the running tool so its tokens stay in sync.
  React.useEffect(() => {
    if (readyRef.current && resolvedTheme) postTheme(resolvedTheme);
  }, [resolvedTheme, postTheme]);

  // İframe `ready`'yi, relay listener bağlanmadan önce gönderebilir (yarış);
  // o durumda tek seferlik `ready` kaçar ve "bağlanıyor…" hiç temizlenmez.
  // Relay tarafında iframe'e `host-ready` göndererek el sıkışmayı tetikliyoruz:
  // iframe bunu alınca `ready`'yi tekrar yayınlar (bkz. inject.ts).
  const pingHostReady = React.useCallback(() => {
    iframeRef.current?.contentWindow?.postMessage(
      { __meaprojects__: true, kind: "host-ready" },
      "*"
    );
  }, [iframeRef]);

  React.useEffect(() => {
    const handler = async (e: MessageEvent) => {
      const data = e.data as BridgeMessage | null;
      if (!data || data.__meaprojects__ !== true) return;
      // Güvenlik sınırı: mesaj gerçekten bizim iframe'imizden mi geliyor?
      // İframe `allow-same-origin` olmadan sandbox'landığı için origin'i opak
      // ("null") gelir — panel origin'i ile eşleşmez. Bu yüzden origin eşitliği
      // yerine source (contentWindow) kimliğine güveniyoruz.
      if (e.source !== iframeRef.current?.contentWindow) return;
      if (e.origin !== window.location.origin && e.origin !== "null") return;

      if (data.kind === "ready") {
        readyRef.current = true;
        if (resolvedTheme) postTheme(resolvedTheme);
        onReady?.();
        return;
      }

      if (data.kind === "ui.toast") {
        const p = (data.payload ?? {}) as { title?: string; description?: string; variant?: string };
        const fn =
          p.variant === "danger"
            ? toast.error
            : p.variant === "success"
            ? toast.success
            : p.variant === "warning"
            ? toast.warning
            : toast;
        fn(p.title ?? "", { description: p.description });
        return;
      }

      if (data.kind === "event-emit") {
        // Broadcast to all open tools (including the sender for self-events)
        // via the window-level CustomEvent bus. Each BridgeRelay instance
        // listens for this event and forwards it to its own iframe.
        window.dispatchEvent(
          new CustomEvent("meaprojects:tool-event", {
            detail: { source: toolSlug, name: data.name, payload: data.payload },
          })
        );
        return;
      }

      if (data.kind === "request") {
        const reply = (ok: boolean, result: unknown, error?: string) => {
          iframeRef.current?.contentWindow?.postMessage(
            { __meaprojects__: true, kind: "response", id: data.id, ok, result, error },
            "*"
          );
        };

        if (data.channel === "llm.stream") {
          handleStreamRequest(toolSlug, data.id ?? "", data.payload, iframeRef, reply);
        } else if (data.channel === "ui.confirm") {
          const p = (data.payload ?? {}) as { title?: string; message?: string };
          const result = await showConfirmDialog(p);
          reply(true, result);
        } else {
          try {
            const result = await routeBridgeRequest(toolSlug, data.channel ?? "", data.payload);
            reply(true, result);
          } catch (err) {
            reply(false, undefined, (err as Error).message);
          }
        }
      }
    };

    window.addEventListener("message", handler);
    // Listener artık bağlı; iframe bizden önce yüklenip `ready`'yi kaçırmış
    // olabilir. `host-ready` ile el sıkışmayı tetikle (iframe `ready`'yi
    // yeniden yollar). İframe henüz yüklenmediyse bu mesaj kaybolur ama o
    // durumda iframe kendi `ready`'sini biz dinlerken gönderecektir.
    pingHostReady();
    return () => window.removeEventListener("message", handler);
  }, [iframeRef, toolSlug, onReady, resolvedTheme, postTheme, pingHostReady, showConfirmDialog]);

  return confirmDialog ? (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50"
      onClick={(e) => { if (e.target === e.currentTarget) handleConfirmAnswer(false); }}
    >
      <div className="w-full max-w-sm rounded-2xl border border-[var(--border)] bg-[var(--bg)] p-6 shadow-2xl">
        <h2 className="text-[15px] font-medium text-text leading-snug">{confirmDialog.title}</h2>
        {confirmDialog.message && (
          <p className="mt-2 text-[13px] text-text-muted leading-relaxed">{confirmDialog.message}</p>
        )}
        <div className="mt-6 flex justify-end gap-2">
          <button
            onClick={() => handleConfirmAnswer(false)}
            className="rounded-lg border border-[var(--border)] px-4 py-2 text-[13px] text-text-muted hover:text-text transition-colors"
          >
            İptal
          </button>
          <button
            onClick={() => handleConfirmAnswer(true)}
            className="rounded-lg bg-text px-4 py-2 text-[13px] text-[var(--bg)] hover:opacity-80 transition-opacity"
          >
            Tamam
          </button>
        </div>
      </div>
    </div>
  ) : null;
}

async function handleStreamRequest(
  toolSlug: string,
  requestId: string,
  payload: unknown,
  iframeRef: React.RefObject<HTMLIFrameElement>,
  reply: (ok: boolean, result: unknown, error?: string) => void
): Promise<void> {
  const sendChunk = (chunk: string) => {
    iframeRef.current?.contentWindow?.postMessage(
      { __meaprojects__: true, kind: "stream-chunk", id: requestId, chunk },
      "*"
    );
  };

  try {
    const res = await fetch("/api/bridge/llm", {
      method: "POST",
      headers: { "content-type": "application/json", "x-meaprojects-tool": toolSlug },
      body: JSON.stringify({ ...(payload as object), stream: true }),
    });

    if (!res.ok || !res.body) {
      const data = await res.json().catch(() => ({})) as { error?: string };
      reply(false, undefined, data.error ?? "LLM streaming hatası");
      return;
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";

      for (const line of lines) {
        if (!line.startsWith("data: ")) continue;
        const raw = line.slice(6).trim();
        if (!raw) continue;
        try {
          const msg = JSON.parse(raw) as { type: string; chunk?: string; error?: string } & Record<string, unknown>;
          if (msg.type === "chunk" && msg.chunk) {
            sendChunk(msg.chunk);
          } else if (msg.type === "done") {
            reply(true, msg);
          } else if (msg.type === "error") {
            reply(false, undefined, msg.error ?? "Stream hatası");
          }
        } catch { /* malformed SSE line — skip */ }
      }
    }
  } catch (err) {
    reply(false, undefined, (err as Error).message);
  }
}

async function routeBridgeRequest(toolSlug: string, channel: string, payload: unknown): Promise<unknown> {
  if (channel.startsWith("jobs.")) {
    const op = channel.split(".")[1];
    const res = await fetch("/api/bridge/jobs", {
      method: "POST",
      headers: { "content-type": "application/json", "x-meaprojects-tool": toolSlug },
      body: JSON.stringify({ op, ...(payload as object) }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data?.error ?? "Job hatası");
    return data;
  }
  if (channel === "notifications.poll") {
    const res = await fetch("/api/bridge/notifications", {
      method: "POST",
      headers: { "content-type": "application/json", "x-meaprojects-tool": toolSlug },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data?.error ?? "Bildirim hatası");
    return data;
  }
  if (channel === "llm.complete") {
    const res = await fetch("/api/bridge/llm", {
      method: "POST",
      headers: { "content-type": "application/json", "x-meaprojects-tool": toolSlug },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data?.error ?? "LLM hatası");
    return data;
  }
  if (channel === "storage.get" || channel === "storage.set" || channel === "storage.delete" || channel === "storage.list" || channel === "storage.getAll") {
    const op = channel.split(".")[1];
    const res = await fetch("/api/bridge/storage", {
      method: "POST",
      headers: { "content-type": "application/json", "x-meaprojects-tool": toolSlug },
      body: JSON.stringify({ op, ...(payload as object) }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data?.error ?? "Storage hatası");
    return data.result;
  }
  throw new Error(`Bilinmeyen bridge kanalı: ${channel}`);
}

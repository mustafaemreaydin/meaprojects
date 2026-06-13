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

export function BridgeRelay({ iframeRef, toolSlug, onReady }: BridgeRelayProps) {
  const { resolvedTheme } = useTheme();
  const readyRef = React.useRef(false);

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
        // MVP: aynı tool'a echo + console log. Diğer tool'lara dağıtım v2'de.
        // TODO(v2): cross-tool event bus.
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
  }, [iframeRef, toolSlug, onReady, resolvedTheme, postTheme, pingHostReady]);

  return null;
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
  if (channel === "storage.get" || channel === "storage.set" || channel === "storage.delete" || channel === "storage.list") {
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
  if (channel === "ui.confirm") {
    const p = (payload ?? {}) as { title?: string; message?: string };
    return window.confirm(`${p.title ?? ""}\n\n${p.message ?? ""}`);
  }
  throw new Error(`Bilinmeyen bridge kanalı: ${channel}`);
}

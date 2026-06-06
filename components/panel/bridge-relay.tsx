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
      iframeRef.current?.contentWindow?.postMessage(
        { __meaprojects__: true, kind: "event", name: "theme", payload: { theme } },
        window.location.origin
      );
    },
    [iframeRef]
  );

  // Push theme changes to the running tool so its tokens stay in sync.
  React.useEffect(() => {
    if (readyRef.current && resolvedTheme) postTheme(resolvedTheme);
  }, [resolvedTheme, postTheme]);

  React.useEffect(() => {
    const handler = async (e: MessageEvent) => {
      const data = e.data as BridgeMessage | null;
      if (!data || data.__meaprojects__ !== true) return;
      if (e.source !== iframeRef.current?.contentWindow) return;
      if (e.origin !== window.location.origin) return;

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
            window.location.origin
          );
        };
        try {
          const result = await routeBridgeRequest(toolSlug, data.channel ?? "", data.payload);
          reply(true, result);
        } catch (err) {
          reply(false, undefined, (err as Error).message);
        }
      }
    };

    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }, [iframeRef, toolSlug, onReady, resolvedTheme, postTheme]);

  return null;
}

async function routeBridgeRequest(toolSlug: string, channel: string, payload: unknown): Promise<unknown> {
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

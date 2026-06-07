import { prisma } from "@/lib/db";
import { decryptString } from "@/lib/crypto";
import { settingKeyFor } from "@/lib/llm";
import type { LlmProvider } from "@/lib/llm";
import { maskApiKey } from "@/lib/utils";
import { ApiKeysForm, type ProviderInfo } from "./api-keys-form";

const PROVIDERS: { id: LlmProvider; label: string; placeholder: string; available: boolean; note?: string }[] = [
  {
    id: "openrouter",
    label: "OpenRouter",
    placeholder: "sk-or-...",
    available: true,
    note: "One key, every model. Tools call any model slug (e.g. google/gemini-flash-1.5, anthropic/claude-3.5-haiku).",
  },
];

function metaKeyFor(provider: LlmProvider): string {
  return `apiKeyMeta:${provider}`;
}

export default async function ApiKeysPage() {
  const keys = new Set([
    ...PROVIDERS.map((p) => settingKeyFor(p.id)),
    ...PROVIDERS.map((p) => metaKeyFor(p.id)),
  ]);
  const rows = await prisma.setting.findMany({
    where: { key: { in: Array.from(keys) } },
  });

  const info: ProviderInfo[] = PROVIDERS.map((p) => {
    const keyRow = rows.find((r) => r.key === settingKeyFor(p.id));
    const metaRow = rows.find((r) => r.key === metaKeyFor(p.id));

    let masked: string | null = null;
    if (keyRow) {
      try {
        masked = maskApiKey(decryptString(keyRow.value));
      } catch {
        masked = "•••••";
      }
    }

    let lastTestedAt: string | null = null;
    let lastTestOk: boolean | null = null;
    if (metaRow) {
      try {
        const meta = JSON.parse(metaRow.value) as { lastTestedAt?: string; lastTestOk?: boolean };
        lastTestedAt = meta.lastTestedAt ?? null;
        lastTestOk = typeof meta.lastTestOk === "boolean" ? meta.lastTestOk : null;
      } catch {
        /* ignore */
      }
    }

    return {
      id: p.id,
      label: p.label,
      placeholder: p.placeholder,
      available: p.available,
      note: p.note,
      hasKey: Boolean(keyRow),
      masked,
      lastTestedAt,
      lastTestOk,
    };
  });

  return (
    <div className="flex flex-col gap-6 max-w-[640px]">
      <div>
        <h2 className="text-h2 text-text">API Keys</h2>
        <p className="mt-1 text-[14px] text-text-muted">
          Keys used to connect to LLM providers. Stored on disk encrypted with AES-256-GCM.
        </p>
      </div>
      <ApiKeysForm providers={info} />
    </div>
  );
}

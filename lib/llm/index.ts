import { prisma } from "@/lib/db";
import { decryptString } from "@/lib/crypto";
import { openrouterAdapter } from "./openrouter";
import type {
  LlmAdapter,
  LlmCompleteRequest,
  LlmCompleteResponse,
  LlmProvider,
} from "./types";

export type { LlmProvider, LlmMessage, LlmCompleteRequest, LlmCompleteResponse } from "./types";

// OpenRouter is the single gateway — one key, every model.
const ADAPTERS: Record<LlmProvider, LlmAdapter> = {
  openrouter: openrouterAdapter,
};

export function getAdapter(provider: LlmProvider): LlmAdapter {
  const a = ADAPTERS[provider];
  if (!a) throw new Error(`Bilinmeyen provider: ${provider}`);
  return a;
}

export function settingKeyFor(provider: LlmProvider): string {
  return `apiKey:${provider}`;
}

export async function getApiKey(provider: LlmProvider): Promise<string | null> {
  const row = await prisma.setting.findUnique({ where: { key: settingKeyFor(provider) } });
  if (!row) return null;
  try {
    return decryptString(row.value);
  } catch {
    return null;
  }
}

export async function llmComplete(req: LlmCompleteRequest): Promise<LlmCompleteResponse> {
  const key = await getApiKey(req.provider);
  if (!key) {
    throw new Error(
      `'${req.provider}' için API anahtarı tanımlı değil. Ayarlar → API Keys'e ekle.`
    );
  }
  return getAdapter(req.provider).complete(req, key);
}

export async function llmStream(
  req: LlmCompleteRequest,
  onChunk: (text: string) => void
): Promise<LlmCompleteResponse> {
  const key = await getApiKey(req.provider);
  if (!key) {
    throw new Error(
      `'${req.provider}' için API anahtarı tanımlı değil. Ayarlar → API Keys'e ekle.`
    );
  }
  return getAdapter(req.provider).stream(req, key, onChunk);
}

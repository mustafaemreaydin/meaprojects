import OpenAI from "openai";
import type { LlmAdapter, LlmCompleteRequest, LlmCompleteResponse } from "./types";

// OpenRouter is OpenAI-compatible. One key → every model (anthropic/…, openai/…, google/…).
const BASE_URL = "https://openrouter.ai/api/v1";

function client(apiKey: string) {
  return new OpenAI({
    apiKey,
    baseURL: BASE_URL,
    defaultHeaders: {
      "HTTP-Referer": process.env.NEXTAUTH_URL ?? "https://meaprojects.com",
      "X-Title": "meaprojects.com",
    },
  });
}

export const openrouterAdapter: LlmAdapter = {
  async complete(req: LlmCompleteRequest, apiKey: string): Promise<LlmCompleteResponse> {
    const messages = req.system
      ? [{ role: "system" as const, content: req.system }, ...req.messages]
      : req.messages;

    const res = await client(apiKey).chat.completions.create({
      model: req.model, // OpenRouter model slug, e.g. "anthropic/claude-3.5-haiku"
      temperature: req.temperature,
      max_tokens: req.maxTokens,
      messages: messages.map((m) => ({ role: m.role, content: m.content })),
    });

    const choice = res.choices[0];
    return {
      text: choice?.message?.content?.trim() ?? "",
      model: res.model,
      provider: "openrouter",
      inputTokens: res.usage?.prompt_tokens ?? 0,
      outputTokens: res.usage?.completion_tokens ?? 0,
    };
  },

  async testKey(apiKey) {
    try {
      await client(apiKey).models.list();
      return { ok: true };
    } catch (err) {
      return { ok: false, error: (err as Error).message };
    }
  },
};

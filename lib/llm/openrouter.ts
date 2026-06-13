import OpenAI from "openai";
import type { LlmAdapter, LlmCompleteRequest, LlmCompleteResponse } from "./types";

// OpenRouter is OpenAI-compatible. One key → every model (anthropic/…, openai/…, google/…).
const BASE_URL = "https://openrouter.ai/api/v1";

function client(apiKey: string) {
  return new OpenAI({
    apiKey,
    baseURL: BASE_URL,
    timeout: 60_000, // fail with a clear error instead of hanging
    maxRetries: 1,
    defaultHeaders: {
      "HTTP-Referer": process.env.NEXTAUTH_URL ?? "https://meaprojects.com",
      "X-Title": "meaprojects.com",
    },
  });
}

function buildMessages(req: LlmCompleteRequest) {
  return req.system
    ? [{ role: "system" as const, content: req.system }, ...req.messages]
    : req.messages;
}

export const openrouterAdapter: LlmAdapter = {
  async complete(req: LlmCompleteRequest, apiKey: string): Promise<LlmCompleteResponse> {
    const res = await client(apiKey).chat.completions.create({
      model: req.model,
      temperature: req.temperature,
      max_tokens: req.maxTokens,
      messages: buildMessages(req).map((m) => ({ role: m.role, content: m.content })),
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

  async stream(req: LlmCompleteRequest, apiKey: string, onChunk: (text: string) => void): Promise<LlmCompleteResponse> {
    const iter = await client(apiKey).chat.completions.create({
      model: req.model,
      temperature: req.temperature,
      max_tokens: req.maxTokens,
      messages: buildMessages(req).map((m) => ({ role: m.role, content: m.content })),
      stream: true,
      stream_options: { include_usage: true },
    });

    let fullText = "";
    let inputTokens = 0;
    let outputTokens = 0;
    let finalModel = req.model;

    for await (const chunk of iter) {
      const delta = chunk.choices[0]?.delta?.content ?? "";
      if (delta) {
        fullText += delta;
        onChunk(delta);
      }
      if (chunk.usage) {
        inputTokens = chunk.usage.prompt_tokens ?? 0;
        outputTokens = chunk.usage.completion_tokens ?? 0;
      }
      if (chunk.model) finalModel = chunk.model;
    }

    return {
      text: fullText,
      model: finalModel,
      provider: "openrouter",
      inputTokens,
      outputTokens,
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

import Anthropic from "@anthropic-ai/sdk";
import type { LlmAdapter, LlmCompleteRequest, LlmCompleteResponse } from "./types";

export const anthropicAdapter: LlmAdapter = {
  async complete(req: LlmCompleteRequest, apiKey: string): Promise<LlmCompleteResponse> {
    const client = new Anthropic({ apiKey });

    const systemMessages = req.messages.filter((m) => m.role === "system").map((m) => m.content);
    const nonSystem = req.messages.filter((m) => m.role !== "system");

    const res = await client.messages.create({
      model: req.model,
      max_tokens: req.maxTokens ?? 1024,
      temperature: req.temperature,
      system: req.system ?? (systemMessages.length ? systemMessages.join("\n\n") : undefined),
      messages: nonSystem.map((m) => ({
        role: m.role === "assistant" ? "assistant" : "user",
        content: m.content,
      })),
    });

    const text = res.content
      .map((b) => (b.type === "text" ? b.text : ""))
      .join("")
      .trim();

    return {
      text,
      model: res.model,
      provider: "anthropic",
      inputTokens: res.usage.input_tokens,
      outputTokens: res.usage.output_tokens,
    };
  },

  async testKey(apiKey) {
    try {
      const client = new Anthropic({ apiKey });
      await client.messages.create({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 1,
        messages: [{ role: "user", content: "hi" }],
      });
      return { ok: true };
    } catch (err) {
      return { ok: false, error: (err as Error).message };
    }
  },
};

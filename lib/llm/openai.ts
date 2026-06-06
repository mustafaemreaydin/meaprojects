import OpenAI from "openai";
import type { LlmAdapter, LlmCompleteRequest, LlmCompleteResponse } from "./types";

export const openaiAdapter: LlmAdapter = {
  async complete(req: LlmCompleteRequest, apiKey: string): Promise<LlmCompleteResponse> {
    const client = new OpenAI({ apiKey });
    const res = await client.chat.completions.create({
      model: req.model,
      temperature: req.temperature,
      max_tokens: req.maxTokens,
      messages: req.messages.map((m) => ({ role: m.role, content: m.content })),
    });

    const choice = res.choices[0];
    return {
      text: choice?.message?.content?.trim() ?? "",
      model: res.model,
      provider: "openai",
      inputTokens: res.usage?.prompt_tokens ?? 0,
      outputTokens: res.usage?.completion_tokens ?? 0,
    };
  },

  async testKey(apiKey) {
    try {
      const client = new OpenAI({ apiKey });
      await client.models.list();
      return { ok: true };
    } catch (err) {
      return { ok: false, error: (err as Error).message };
    }
  },
};

export type LlmProvider = "openrouter" | "anthropic" | "openai" | "google";

export interface LlmMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface LlmCompleteRequest {
  provider: LlmProvider;
  model: string;
  messages: LlmMessage[];
  maxTokens?: number;
  temperature?: number;
  system?: string;
}

export interface LlmCompleteResponse {
  text: string;
  model: string;
  provider: LlmProvider;
  inputTokens: number;
  outputTokens: number;
  costUsd?: number;
}

export interface LlmAdapter {
  complete(req: LlmCompleteRequest, apiKey: string): Promise<LlmCompleteResponse>;
  testKey(apiKey: string): Promise<{ ok: true } | { ok: false; error: string }>;
}

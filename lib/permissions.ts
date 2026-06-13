// Permission string'leri "namespace:value" formatında.
// Örn: "llm:anthropic", "llm:openai", "storage:local", "events:emit", "events:listen"

export type Permission = string;

export const KNOWN_PERMISSIONS = [
  "llm:openrouter",
  "storage:local",
  "events:emit",
  "events:listen",
  "jobs:write",
] as const;

export interface PermissionInfo {
  id: string;
  label: string;
  description: string;
}

const REGISTRY: Record<string, PermissionInfo> = {
  "llm:openrouter": {
    id: "llm:openrouter",
    label: "LLM — OpenRouter",
    description: "Tool, OpenRouter üzerinden tüm modellere (tek cüzdan) panel aracılığıyla çağrı yapabilir.",
  },
  "storage:local": {
    id: "storage:local",
    label: "Yerel Storage",
    description: "Tool, panel SQLite'ında kendi izole alanına yazıp okuyabilir.",
  },
  "events:emit": {
    id: "events:emit",
    label: "Olay yayma",
    description: "Tool, diğer tool'lara olay yayabilir.",
  },
  "events:listen": {
    id: "events:listen",
    label: "Olay dinleme",
    description: "Tool, panel olay yolundan gelen olayları dinleyebilir.",
  },
};

export function describePermission(id: string): PermissionInfo {
  return (
    REGISTRY[id] ?? {
      id,
      label: id,
      description: "Bilinmeyen izin.",
    }
  );
}

export function hasPermission(granted: string[], required: string): boolean {
  return granted.includes(required);
}

export function llmPermissionFor(provider: string): string {
  return `llm:${provider}`;
}

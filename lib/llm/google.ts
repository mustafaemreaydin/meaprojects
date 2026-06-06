import type { LlmAdapter } from "./types";

// TODO(v2): Google Generative AI SDK entegrasyonu.
// MVP'de stub; Google sağlayıcısı seçilirse anlamlı hata döner.
export const googleAdapter: LlmAdapter = {
  async complete() {
    throw new Error("Google provider henüz desteklenmiyor. v2'de gelecek.");
  },
  async testKey() {
    return { ok: false, error: "Google provider henüz desteklenmiyor. v2'de gelecek." };
  },
};

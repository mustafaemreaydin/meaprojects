# Bridge API — `window.meaprojects`

Tool'lar, panel ile **`window.meaprojects`** üzerinden konuşur. Bridge, tool iframe'i yüklenirken otomatik olarak `<head>` içine enjekte edilir. Tool kodunun bu API dışında ağa erişim hakkı yoktur (iframe sandbox + `allow-same-origin` yok).

## Güvenlik kuralları

- Iframe `sandbox="allow-scripts allow-forms allow-popups allow-downloads"` ile çalışır. **`allow-same-origin` verilmez.**
- Tüm bridge çağrıları `postMessage` ile parent'a gider. Parent, `event.origin === window.location.origin` doğrular.
- API anahtarları **asla** tool'a sızmaz. LLM çağrıları `/api/bridge/llm` üzerinden proxy edilir; key panel sunucusunda kalır.
- Her tool kendi `toolId` scope'unda storage erişir; başka tool'un verisini göremez.
- Rate limit: tool başına dakikada 30 LLM çağrısı (env: `LLM_RATE_LIMIT_PER_MIN`).
- Manifest'te beyan edilmeyen izinler 403 ile reddedilir.

## API yüzeyi

### `meaprojects.llm.complete(options)`

```ts
const out = await window.meaprojects.llm.complete({
  provider: "anthropic",
  model: "claude-haiku-4-5-20251001",
  messages: [{ role: "user", content: "Merhaba" }],
  maxTokens: 256,
  temperature: 0.7,
  system: "Sen yardımsever bir asistansın.",
});

// out: { text, model, provider, inputTokens, outputTokens, costUsd? }
```

İzinler: `llm:anthropic` / `llm:openai` / `llm:google` (provider'a göre).

### `meaprojects.storage`

```ts
await window.meaprojects.storage.set("draft", { title: "...", body: "..." });
const draft = await window.meaprojects.storage.get<{ title: string; body: string }>("draft");
await window.meaprojects.storage.delete("draft");
const keys = await window.meaprojects.storage.list(); // string[]
```

İzin: `storage:local`. Veriler `ToolStorage` tablosunda `(toolId, key)` benzersizliğiyle JSON olarak tutulur.

### `meaprojects.events`

```ts
window.meaprojects.events.on("user-action", (payload) => { ... });
window.meaprojects.events.emit("ready", { version: "0.1.0" });
```

İzinler: `events:listen`, `events:emit`. Olaylar yalnızca **panel ↔ tool** arası geçer; başka tool'a yayılmaz.

### `meaprojects.ui`

```ts
window.meaprojects.ui.toast("Kaydedildi", { tone: "success" }); // tone: "info"|"success"|"warning"|"danger"
const ok = await window.meaprojects.ui.confirm("Silmek istediğine emin misin?");
```

UI çağrıları panel chrome'una yönlendirilir; tool'un kendi UI'ı için ek izin gerekmez.

### `meaprojects.context`

```ts
window.meaprojects.context.toolSlug;   // "hello-tool"
window.meaprojects.context.user;       // { id, email, name }
window.meaprojects.context.theme;      // "light" | "dark"
window.meaprojects.context.locale;     // "tr"
```

Sync getter'lar; bridge bootstrap sırasında parent tarafından doldurulur.

## Hatalar

Tüm async çağrılar başarısız olduğunda reject edilir:

```ts
try {
  await window.meaprojects.llm.complete({...});
} catch (e) {
  // e.message — kullanıcıya gösterilebilir Türkçe mesaj
}
```

Olası hata kategorileri:

- **`permission_denied`** — manifest izni yok.
- **`rate_limited`** — dakika kotası aşıldı.
- **`provider_key_missing`** — Ayarlar → API Keys'e ilgili sağlayıcı eklenmemiş.
- **`provider_error`** — sağlayıcıdan gelen hata (mesaj iletilir).
- **`invalid_request`** — şema doğrulaması başarısız.

## Versiyonlama

`meaprojects.version` (örn. `"1.0"`) tool'un köprü sürümünü öğrenmesi için. Geriye dönük kırılma olmadan API genişletilir; mevcut çağrılar her zaman çalışır.

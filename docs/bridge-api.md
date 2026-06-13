# Bridge API — `window.meaprojects`

Tool'lar, panel ile **`window.meaprojects`** üzerinden konuşur. Bridge, tool iframe'i yüklenirken otomatik olarak `<head>` içine enjekte edilir. Tool kodunun bu API dışında ağa erişim hakkı yoktur (iframe sandbox + `allow-same-origin` yok).

## Güvenlik kuralları

- Iframe `sandbox="allow-scripts allow-forms allow-popups allow-downloads"` ile çalışır. **`allow-same-origin` verilmez.**
- Tüm bridge çağrıları `postMessage` ile parent'a gider. Parent, `event.source === iframe.contentWindow` doğrular.
- API anahtarları **asla** tool'a sızmaz. LLM çağrıları `/api/bridge/llm` üzerinden proxy edilir; key panel sunucusunda kalır.
- Her tool kendi `toolId` scope'unda storage erişir; başka tool'un verisini göremez.
- Rate limit: tool başına dakikada 30 LLM çağrısı (env: `LLM_RATE_LIMIT_PER_MIN`).
- Manifest'te beyan edilmeyen izinler 403 ile reddedilir.

## Kritik kısıtlamalar

- **Harici JS/CSS/font dosyaları çalışmaz.** Sandboxed iframe içinde CDN `<script src>` ve `<link rel=stylesheet>` engellenir — hata bile çıkmaz, JS sessizce çalışmaz. Her şeyi `index.html` içine göm (UMD bundle'ı satır içi `<script>`, fontları `@font-face` base64).
- **ES modül kullanma.** `type="module"` aynı nedenle bloklanır.
- **`fetch` ile harici kaynak çekme** CORS'a takılır. Worker blob'ları ve fontlar `<script type="text/plain">` veya base64 olarak göm, `fetch` ile değil.

## API yüzeyi

### `meaprojects.llm.complete(options)` — tek seferlik

```js
const out = await window.meaprojects.llm.complete({
  model: "google/gemini-2.5-flash",   // OpenRouter model slug: <vendor>/<model>
  messages: [{ role: "user", content: "Merhaba" }],
  maxTokens: 1024,          // isteğe bağlı — model limiti geçerli, sunucu tarafı kap yok
  temperature: 0.7,         // isteğe bağlı
  system: "...",            // isteğe bağlı sistem mesajı
});
// out: { text, model, provider, inputTokens, outputTokens, costUsd? }
```

### `meaprojects.llm.stream(options, onChunk)` — gerçek akış

Token'lar üretildikçe `onChunk` çağrılır; promise stream bitince çözümlenir.

```js
const out = await window.meaprojects.llm.stream(
  {
    model: "google/gemini-2.5-flash",
    messages: [{ role: "user", content: "Merhaba" }],
    maxTokens: 2048,
  },
  (chunk) => {
    // Her token geldiğinde burası çağrılır
    outputEl.textContent += chunk;
  }
);
// out: { text, model, provider, inputTokens, outputTokens, costUsd? }
// out.text tüm metnin birleşimidir (chunk'ları kendin biriktirmen gerekmez)
```

İzin: `llm:openrouter`. Model slug'ları değişir — https://openrouter.ai/models'den kontrol et.

### `meaprojects.storage`

```js
await window.meaprojects.storage.set("draft", { title: "...", body: "..." });
const draft = await window.meaprojects.storage.get("draft");  // → value | null
await window.meaprojects.storage.delete("draft");
const keys = await window.meaprojects.storage.list("prefix"); // → string[]
```

İzin: `storage:local`. Veriler `ToolStorage` tablosunda `(toolId, key)` benzersizliğiyle JSON olarak tutulur.

### `meaprojects.events`

```js
window.meaprojects.events.on("user-action", (payload) => { /* ... */ });
window.meaprojects.events.emit("ready", { version: "0.1.0" });
window.meaprojects.events.off("user-action", handler);
```

İzinler: `events:listen`, `events:emit`. Olaylar yalnızca **panel ↔ tool** arası geçer.

### `meaprojects.ui`

```js
window.meaprojects.ui.toast({ title: "Kaydedildi", variant: "success" });
// variant: "success" | "warning" | "danger" | undefined
const ok = await window.meaprojects.ui.confirm({ title: "Emin misin?", message: "Silinecek." });
```

### `meaprojects.context`

```js
window.meaprojects.context.toolSlug;   // "hello-tool"
window.meaprojects.context.user;       // { id, name }
window.meaprojects.context.theme;      // "light" | "dark"
window.meaprojects.context.locale;     // "tr"
```

Sync getter'lar; bridge bootstrap sırasında parent tarafından doldurulur. Theme değiştiğinde panel bir `theme` eventi yollar — `context.theme` otomatik güncellenir.

## Bridge ne zaman hazır?

Bridge, `<head>` içine enjekte edildiği için sayfa yüklenirken kurulur. Kullanıcı etkileşimi (`click`, form `submit`) sırasında her zaman hazırdır. **Sayfa yüklenir yüklenmez** (DOMContentLoaded / `<script>` top-level) bridge çağrısı yapmaktan kaçın — çok nadir de olsa yarış koşulu yaşanabilir. Başlangıç verisini `DOMContentLoaded` sonrasında yükle, aksiyonları event handler içinde tetikle.

## Hatalar

Tüm async çağrılar başarısız olduğunda `Error` ile reject edilir:

```js
try {
  await window.meaprojects.llm.complete({ /* ... */ });
} catch (e) {
  // e.message — kullanıcıya gösterilebilir mesaj
  window.meaprojects.ui.toast({ title: "Hata", description: e.message, variant: "danger" });
}
```

Olası hata kategorileri:

- **`permission_denied`** — manifest izni yok.
- **`rate_limited`** — dakika kotası aşıldı.
- **`provider_key_missing`** — Ayarlar → API Keys'e OpenRouter anahtarı eklenmemiş.
- **`provider_error`** — OpenRouter'dan gelen hata (mesaj iletilir).
- **`invalid_request`** — şema doğrulaması başarısız.

## Panel konsola erişim zordur — hata banner'ı ekle

Panel içindeki iframe konsoluna doğrudan erişilemez. Debug için tool'a görünür bir hata banner'ı koy:

```html
<div id="fatal" style="display:none;position:fixed;inset:0;background:#b83232;color:#fff;padding:16px;z-index:9999;font-family:monospace;white-space:pre-wrap"></div>
<script>
  window.onerror = (msg, src, line, col, err) => {
    var el = document.getElementById("fatal");
    el.textContent = (err && err.stack) || msg;
    el.style.display = "block";
  };
  window.addEventListener("unhandledrejection", (e) => {
    var el = document.getElementById("fatal");
    el.textContent = String(e.reason);
    el.style.display = "block";
  });
</script>
```

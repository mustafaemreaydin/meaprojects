# meaprojects.com — Tool Authoring Guide (give this whole file to your AI)

You are building a **tool** (a small web app / "plugin") for the **meaprojects.com** panel.
This single file contains everything you need. Produce a **.zip** the user can upload at
**Tools → Upload**.

---

## 1. How a tool runs (read first)

- A tool is plain front-end: **HTML + CSS + JS** (a static page or an SPA build). No server.
- It runs inside a **sandboxed iframe** served by the panel. The panel's CSS does NOT leak in,
  but the panel auto-injects a design layer + a bridge (see §3, §4).
- The tool talks to the outside world (LLMs, storage) **only** through `window.meaprojects`
  (the bridge). **Never put API keys in a tool** — the panel holds them.
- Output = a **.zip** whose ROOT contains `tool.json` and your entry file (e.g. `index.html`)
  plus any assets. Do not nest everything in a subfolder.

---

## 2. `tool.json` (manifest, required at zip root)

```json
{
  "slug": "my-tool",
  "name": "My Tool",
  "version": "1.0.0",
  "description": "One sentence about what it does.",
  "type": "static",
  "entry": "index.html",
  "author": "Your Name",
  "permissions": ["llm:anthropic", "storage:local"],
  "category": "optional",
  "tags": ["optional"]
}
```

Field rules:
- `slug` — kebab-case, 3–42 chars, `^[a-z0-9][a-z0-9-]{1,40}[a-z0-9]$`. Becomes the tool's
  subdomain: `slug.meaprojects.com`. Must be unique.
- `version` — semver `x.y.z`.
- `type` — `"static"` (single HTML) or `"spa"` (built single-page app). `"backend"` is NOT
  supported yet — do not use it.
- `entry` — the HTML file to load, relative to zip root (usually `index.html`).
- `permissions` — declare ONLY what you use (see §5). Unknown values are rejected.

---

## 3. The bridge — `window.meaprojects`

Available globally inside the tool once loaded. All methods are async (return Promises)
unless noted.

```js
// Context (read-only)
window.meaprojects.context
// → { toolSlug, theme: "light" | "dark", locale, user: { id, name } }

// LLM — routed through OpenRouter (one wallet → every model). The panel injects
// the API key & enforces your declared permission. `provider` is optional and
// defaults to "openrouter".
const res = await window.meaprojects.llm.complete({
  model: "anthropic/claude-3.5-haiku",   // OpenRouter model slug (see notes below)
  messages: [{ role: "user", content: "Hello" }],  // roles: system|user|assistant
  maxTokens: 1024,                       // optional
  temperature: 0.7,                      // optional
  system: "optional system prompt",      // optional
});
// res → { text, model, provider, inputTokens, outputTokens, costUsd? }
// res.text is the model's reply string.

// Storage — per-tool isolated key/value (values are JSON-serializable)
await window.meaprojects.storage.set("key", anyJsonValue);
const v = await window.meaprojects.storage.get("key");   // → value | null
await window.meaprojects.storage.delete("key");
const keys = await window.meaprojects.storage.list("prefix"); // → string[]

// Events (optional, between tools / panel)
window.meaprojects.events.emit("name", payload);
window.meaprojects.events.on("name", (payload) => { ... });
window.meaprojects.events.off("name", handler);

// UI helpers (use the panel's toast/confirm so it matches the app)
window.meaprojects.ui.toast({ title: "Done", description: "…", variant: "success" });
// variant: "success" | "warning" | "danger" | undefined
const ok = await window.meaprojects.ui.confirm({ title: "Sure?", message: "…" }); // → boolean
```

**Model notes:** use an **OpenRouter model slug** — `<vendor>/<model>`, e.g.
`anthropic/claude-3.5-haiku`, `anthropic/claude-3.5-sonnet`, `openai/gpt-4o-mini`,
`openai/gpt-4o`, `google/gemini-flash-1.5`, `meta-llama/llama-3.1-70b-instruct`.
One OpenRouter key (set by admin under Settings → API Keys) unlocks all of them. If unsure,
default to a small/fast model like `anthropic/claude-3.5-haiku`.

**Errors:** bridge calls reject with an `Error` (e.g. missing permission, no API key, rate
limit). Wrap in try/catch and surface failures via `ui.toast({ variant: "danger" })`.

---

## 4. Design — mea-ui (auto-injected, opt-in)

The panel injects the **Anta Trial** font, design tokens, and helpers into your HTML.
Use them so the tool matches the panel automatically and follows light/dark theme live.

CSS variables available (light + dark, switched by `[data-theme]` on `<html>`):

| Token | Use |
|---|---|
| `--bg` | page background |
| `--bg-elevated` | subtle raised surface |
| `--surface` | cards / inputs |
| `--border` | hairline borders |
| `--text` | primary text |
| `--text-muted` | secondary text |
| `--accent` | primary action color |
| `--radius`, `--radius-sm` | corner radii |

Helper classes: `.mea-card`, `.mea-btn`, `.mea-input`.

**Aesthetic to follow:** strict **black & white / neutral grays only — no colored accents**.
Light, large headings (`font-weight: 300`), generous spacing, rounded corners
(`var(--radius)`), uppercase small labels with letter-spacing. Theme is handled for you —
when the user toggles dark/light in the panel, your `var(--…)` values update live.

Minimal on-brand markup:
```html
<body>
  <div class="mea-card" style="padding:20px;max-width:640px;margin:40px auto">
    <input class="mea-input" placeholder="Type…" />
    <button class="mea-btn">Run</button>
  </div>
</body>
```
You may fully override these with your own CSS — nothing uses `!important`.

---

## 5. Permissions (declare in `tool.json`)

| Permission | Needed for |
|---|---|
| `llm:openrouter` | `llm.complete(...)` (default — any model via OpenRouter) |
| `llm:anthropic` | only if calling Anthropic directly (`provider: "anthropic"`) |
| `llm:openai` | only if calling OpenAI directly (`provider: "openai"`) |
| `llm:google` | Google direct (v2, not active — use OpenRouter instead) |
| `storage:local` | any `storage.*` call |
| `events:emit` | `events.emit` |
| `events:listen` | `events.on` |

Almost always you want just **`llm:openrouter`** (+ `storage:local` if you persist data).

Declaring a permission you don't use is harmless but unnecessary. Calling an API without its
permission throws.

---

## 6. Complete minimal example

**`tool.json`**
```json
{
  "slug": "haiku",
  "name": "Haiku",
  "version": "1.0.0",
  "description": "Turns any topic into a haiku.",
  "type": "static",
  "entry": "index.html",
  "permissions": ["llm:openrouter", "storage:local"]
}
```

**`index.html`**
```html
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Haiku</title>
  <style>
    .wrap { max-width: 600px; margin: 0 auto; padding: 48px 20px; }
    h1 { font-weight: 300; letter-spacing: -.03em; }
    .row { display: flex; gap: 10px; margin-top: 16px; }
    .row .mea-input { flex: 1; }
    .out { margin-top: 20px; padding: 16px; border-radius: var(--radius);
           background: var(--bg-elevated); border: 1px solid var(--border);
           white-space: pre-wrap; color: var(--text); min-height: 48px; }
  </style>
</head>
<body>
  <main class="wrap">
    <h1>Haiku</h1>
    <div class="row">
      <input id="q" class="mea-input" placeholder="A topic…" />
      <button id="go" class="mea-btn">Write</button>
    </div>
    <div id="out" class="out"></div>
  </main>
  <script>
    const out = document.getElementById("out");
    async function run() {
      const topic = document.getElementById("q").value.trim();
      if (!topic) return;
      out.textContent = "Writing…";
      try {
        const res = await window.meaprojects.llm.complete({
          model: "anthropic/claude-3.5-haiku",  // OpenRouter slug; provider defaults to openrouter
          messages: [{ role: "user", content: "Write a haiku about: " + topic }],
          maxTokens: 200,
        });
        out.textContent = res.text;
        await window.meaprojects.storage.set("lastTopic", topic);
      } catch (e) {
        out.textContent = "Error: " + e.message;
        window.meaprojects.ui.toast({ title: "Failed", description: e.message, variant: "danger" });
      }
    }
    document.getElementById("go").addEventListener("click", run);
    document.getElementById("q").addEventListener("keydown", (e) => { if (e.key === "Enter") run(); });
  </script>
</body>
</html>
```

---

## 7. Packaging & install

1. Put `tool.json` + `index.html` (+ assets) **at the root** of a `.zip`.
   - Correct: `myzip.zip → tool.json, index.html`
   - Wrong: `myzip.zip → my-tool/tool.json` (nested — will fail manifest lookup)
2. In the panel: **Tools → Upload**, drop the zip, review permissions, install.
3. Open it from **Apps**, or via its subdomain `slug.meaprojects.com`.
4. The admin grants access to specific members (Users page) or sets the tool to `public`.

---

## 8. Checklist for the AI

- [ ] `tool.json` at zip root, valid slug (kebab, unique), semver version, `type` static/spa.
- [ ] Only declared permissions are used; every bridge call's permission is declared.
- [ ] No API keys, secrets, or hardcoded model credentials in the tool.
- [ ] LLM calls use an OpenRouter model slug (`vendor/model`); `llm:openrouter` is declared;
      errors are caught and shown via `ui.toast`.
- [ ] UI uses `var(--bg/--text/--surface/--border/--accent/--radius)` and `.mea-*` helpers;
      strict black & white aesthetic; works in both light and dark.
- [ ] Entry file matches `entry` in the manifest.
- [ ] Deliver as a zip with files at the root.

---
meaprojects.com — personal AI workspace by Mustafa Emre Aydın (mustafaemreaydin@yandex.com)

# meaprojects.com — Tool Authoring Guide (give this whole file to your AI)

You are building a **tool** (a small web app / "plugin") for the **meaprojects.com** panel.
This single file contains everything you need. Produce a **.zip** the user can upload at
**Tools → Upload**.

---

## 1. How a tool runs (read first)

- A tool is plain front-end: **HTML + CSS + JS** (a static page or an SPA build). No server.
- It runs inside a **sandboxed iframe** served by the panel. The panel's CSS does NOT leak in.
  The panel always injects the **bridge** (`window.meaprojects`). The **design layer** (fonts,
  CSS tokens, dark/light sync) is injected only when you set `"ui": "mea"` in `tool.json` (see §4, §5).
- The tool talks to the outside world (LLMs, storage) **only** through `window.meaprojects`
  (the bridge). **Never put API keys in a tool** — the panel holds them.
- Output = a **.zip** whose ROOT contains `tool.json` and your entry file (e.g. `index.html`)
  plus any assets. Do not nest everything in a subfolder.

---

## 2. Critical constraints (read before writing any code)

These come from how the panel's sandboxed iframe works. Violating them causes **silent failures** — the tool renders but nothing works, with no console errors visible.

### ① Embed everything in `index.html` — no external files

External `<script src="...">` and `<link rel="stylesheet">` are blocked (wrong MIME + nosniff in the sandbox). **All JS, CSS, fonts, and libraries must be inlined** in `index.html`:

- JavaScript libraries → paste the **UMD bundle** as `<script>...</script>` inline.
- Fonts → embed as `@font-face { src: url("data:font/ttf;base64,...") }`.
- Web workers → embed as `<script type="text/plain" id="worker-src">...</script>`, then build a `Blob` URL at runtime.

```html
<!-- WRONG — will silently fail -->
<script src="https://cdn.jsdelivr.net/npm/marked/marked.min.js"></script>

<!-- RIGHT — paste the UMD bundle inline -->
<script>
/* marked v9 UMD bundle contents here */
</script>
```

### ② No ES modules

`type="module"` is blocked for the same MIME reason. Use classic `<script>` + UMD builds only.

### ③ No `fetch` for local assets

`fetch("./worker.js")` is blocked by CORS in the sandbox. Embed workers/fonts as described above.

### ④ Don't call the bridge at top-level script load

`window.meaprojects` is injected before your code runs, but call bridge methods only inside **event handlers** (click, submit, etc.) or after `DOMContentLoaded`. Avoid top-level `await window.meaprojects.storage.get(...)` outside a function.

### ⑤ Add a visible error banner

You cannot open DevTools inside the panel iframe. Add this at the top of `<body>` so any uncaught error is visible:

```html
<div id="fatal" style="display:none;position:fixed;inset:0;background:#b83232;color:#fff;padding:16px;z-index:9999;font-family:monospace;white-space:pre-wrap"></div>
<script>
  window.onerror = function(msg,_s,_l,_c,err){ var el=document.getElementById("fatal"); el.textContent=(err&&err.stack)||msg; el.style.display="block"; };
  window.addEventListener("unhandledrejection", function(e){ var el=document.getElementById("fatal"); el.textContent=String(e.reason); el.style.display="block"; });
</script>
```

---

## 3. `tool.json` (manifest, required at zip root)

```json
{
  "slug": "my-tool",
  "name": "My Tool",
  "version": "1.0.0",
  "description": "One sentence about what it does.",
  "type": "static",
  "entry": "index.html",
  "author": "Your Name",
  "ui": "mea",
  "permissions": ["llm:openrouter", "storage:local"],
  "category": "optional",
  "tags": ["optional"]
}
```

Field rules:
- `slug` — kebab-case, 3–42 chars, `^[a-z0-9][a-z0-9-]{1,40}[a-z0-9]$`. Must be unique.
- `version` — semver `x.y.z`.
- `type` — `"static"` (single HTML) or `"spa"` (built single-page app). `"backend"` is NOT
  supported yet — do not use it.
- `entry` — the HTML file to load, relative to zip root (usually `index.html`).
- `ui` — set to `"mea"` to opt into the panel's design system (tokens + dark/light sync). Omit to keep full control of your own design.
- `permissions` — declare ONLY what you use (see §5). Unknown values are rejected.

---

## 4. The bridge — `window.meaprojects`

Available globally inside the tool. All methods are async (return Promises) unless noted.

```js
// Context (read-only, sync)
window.meaprojects.context
// → { toolSlug, theme: "light" | "dark", locale, user: { id, name } }

// LLM — routed through OpenRouter (one wallet → every model). The panel injects
// the API key & enforces your declared permission.
// One-shot: waits for the full response, then returns it.
const res = await window.meaprojects.llm.complete({
  model: "google/gemini-2.5-flash",      // OpenRouter model slug (see notes below)
  messages: [{ role: "user", content: "Hello" }],  // roles: system|user|assistant
  maxTokens: 1024,                       // optional — no hard cap, model limit applies
  temperature: 0.7,                      // optional
  system: "optional system prompt",      // optional
});
// res → { text, model, provider, inputTokens, outputTokens, costUsd? }

// Streaming: tokens arrive as they are generated — use this for responsive UIs.
const res = await window.meaprojects.llm.stream(
  {
    model: "google/gemini-2.5-flash",
    messages: [{ role: "user", content: "Hello" }],
  },
  (chunk) => {
    // called for each token as it arrives
    outputEl.textContent += chunk;
  }
);
// resolves with the same shape as complete() once the stream is done

// Storage — per-tool isolated key/value (values are JSON-serializable)
await window.meaprojects.storage.set("key", anyJsonValue);
const v = await window.meaprojects.storage.get("key");   // → value | null
await window.meaprojects.storage.delete("key");
const keys = await window.meaprojects.storage.list("prefix"); // → string[]

// Events (optional, between tools / panel)
window.meaprojects.events.emit("name", payload);
window.meaprojects.events.on("name", (payload) => { /* ... */ });
window.meaprojects.events.off("name", handler);

// UI helpers (use the panel's toast/confirm so it matches the app)
window.meaprojects.ui.toast({ title: "Done", description: "…", variant: "success" });
// variant: "success" | "warning" | "danger" | undefined
const ok = await window.meaprojects.ui.confirm({ title: "Sure?", message: "…" }); // → boolean
```

**Model notes:** use a **current OpenRouter model slug** — `<vendor>/<model>`. Model IDs
change over time, so **verify the exact ID at https://openrouter.ai/models**. Good
fast/cheap defaults: `google/gemini-2.5-flash`, `google/gemini-2.5-flash-lite`,
`openai/gpt-4o-mini`. One OpenRouter key (set by admin under Settings → API Keys) unlocks
all of them.

**Errors:** bridge calls reject with an `Error` (e.g. missing permission, no API key, rate
limit). Wrap in try/catch and surface failures via `ui.toast({ variant: "danger" })`.

---

## 5. Design — mea-ui (auto-injected when `"ui": "mea"`)

When `"ui": "mea"` is set in `tool.json`, the panel injects the **Anta Trial** font, design
tokens, and helper classes into your HTML, and keeps `[data-theme]` in sync when the user
switches light/dark in the panel.

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
(`var(--radius)`), uppercase small labels with letter-spacing.

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

## 6. Permissions (declare in `tool.json`)

| Permission | Needed for |
|---|---|
| `llm:openrouter` | `llm.complete(...)` / `llm.stream(...)` — any model via OpenRouter |
| `storage:local` | any `storage.*` call |
| `jobs:write` | `jobs.register/cancel/pause/resume/list` + `notifications.*` |
| `events:emit` | `events.emit` |
| `events:listen` | `events.on` |

LLM access is **OpenRouter-only**. Almost always you want just **`llm:openrouter`**
(+ `storage:local` if you persist data). Use OpenRouter model slugs like
`google/gemini-2.5-flash`, `anthropic/claude-3.5-haiku`, `openai/gpt-4o-mini`.

Declaring a permission you don't use is harmless but unnecessary. Calling an API without its
permission throws.

---

## 7. Complete minimal example

**`tool.json`**
```json
{
  "slug": "haiku",
  "name": "Haiku",
  "version": "1.0.0",
  "description": "Turns any topic into a haiku.",
  "type": "static",
  "entry": "index.html",
  "ui": "mea",
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
  <!-- error banner: visible when JS throws inside panel iframe -->
  <div id="fatal" style="display:none;position:fixed;inset:0;background:#b83232;color:#fff;padding:16px;z-index:9999;font-family:monospace;white-space:pre-wrap"></div>
  <script>
    window.onerror=function(m,_s,_l,_c,e){var el=document.getElementById("fatal");el.textContent=(e&&e.stack)||m;el.style.display="block";};
    window.addEventListener("unhandledrejection",function(e){var el=document.getElementById("fatal");el.textContent=String(e.reason);el.style.display="block";});
  </script>

  <main class="wrap">
    <h1>Haiku</h1>
    <div class="row">
      <input id="q" class="mea-input" placeholder="A topic…" />
      <button id="go" class="mea-btn">Write</button>
    </div>
    <div id="out" class="out"></div>
  </main>
  <script>
    var out = document.getElementById("out");
    async function run() {
      var topic = document.getElementById("q").value.trim();
      if (!topic) return;
      out.textContent = "Writing…";
      try {
        var res = await window.meaprojects.llm.complete({
          model: "google/gemini-2.5-flash",
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
    document.getElementById("q").addEventListener("keydown", function(e){ if (e.key === "Enter") run(); });
  </script>
</body>
</html>
```

---

## 8. Packaging & install

1. Put `tool.json` + `index.html` (+ assets) **at the root** of a `.zip`.
   - Correct: `myzip.zip → tool.json, index.html`
   - Wrong: `myzip.zip → my-tool/tool.json` (nested — will fail manifest lookup)
2. In the panel: **Tools → Upload**, drop the zip, review permissions, install.
3. Open it from **Apps**, or via its subdomain `slug.meaprojects.com`.
4. The admin grants access to specific members (Users page) or sets the tool to `public`.

---

## 9. Checklist for the AI

- [ ] `tool.json` at zip root, valid slug (kebab, unique), semver version, `type` static/spa.
- [ ] Only declared permissions are used; every bridge call's permission is declared.
- [ ] No API keys, secrets, or hardcoded model credentials in the tool.
- [ ] LLM calls use an OpenRouter model slug (`vendor/model`); `llm:openrouter` is declared;
      errors are caught and shown via `ui.toast`.
- [ ] UI uses `var(--bg/--text/--surface/--border/--accent/--radius)` and `.mea-*` helpers;
      strict black & white aesthetic; works in both light and dark. `"ui": "mea"` is in manifest.
- [ ] Entry file matches `entry` in the manifest.
- [ ] **No external `<script src>`, `<link rel=stylesheet>`, or `fetch` for local assets** —
      everything is inlined in `index.html`.
- [ ] **No `type="module"`** — classic `<script>` + UMD only.
- [ ] Error banner (`#fatal` + `window.onerror`) is present at top of `<body>`.
- [ ] Bridge calls are inside event handlers or `DOMContentLoaded`, not bare top-level code.
- [ ] Deliver as a zip with files at the root.

---
meaprojects.com — personal AI workspace by Mustafa Emre Aydın (mustafaemreaydin@yandex.com)

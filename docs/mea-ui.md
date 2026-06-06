# mea-ui — making tools look on-brand

Tools run inside a **sandboxed iframe**, so the panel's CSS does not leak into them.
To keep everything visually consistent, the panel automatically injects a small
**mea-ui** layer into every tool's HTML at serve time. You don't import anything —
it's just there.

## What gets injected

- **Anta Trial** font (the panel's typeface), served from `/fonts/…`.
- **Design tokens** as CSS variables, for light and dark, switched by a `data-theme`
  attribute on `<html>` that stays in sync with the panel:

  | Token | Meaning |
  |---|---|
  | `--bg` | page background |
  | `--bg-elevated` | subtle raised surface |
  | `--surface` | card / input background |
  | `--border` | hairline borders |
  | `--text` | primary text |
  | `--text-muted` | secondary text |
  | `--accent` | primary action color |
  | `--radius`, `--radius-sm` | corner radii |

- **Gentle base styles**: `box-sizing`, `body` font + background + color. All
  overridable — nothing uses `!important`, so a tool with its own design keeps control.
- **Helper classes** you can use directly: `.mea-card`, `.mea-btn`, `.mea-input`.

## Using it

Just reference the variables — no setup:

```html
<body>
  <div class="mea-card" style="padding:20px">
    <h1 style="font-weight:300">On-brand by default</h1>
    <input class="mea-input" placeholder="Type…" />
    <button class="mea-btn">Run</button>
  </div>
</body>
```

Theme is handled for you: when you toggle light/dark in the panel, the tool's
`data-theme` updates live and every `var(--…)` follows.

## The bridge context

```js
window.meaprojects.context // { toolSlug, theme: "light"|"dark", locale, user: { id, name } }
window.meaprojects.llm.complete({ provider, model, messages, maxTokens })
window.meaprojects.storage.get/set/delete/list(...)
window.meaprojects.ui.toast({ title, description, variant })
```

You never put API keys in a tool — `llm.complete` proxies through the panel, which holds
the encrypted keys and enforces the tool's declared permissions.

## Starter template

A ready-to-zip example lives in **`starter-tool/`** (`index.html` + `tool.json`). Zip its
contents and upload it from **Tools → Upload**. It demonstrates the tokens, theme sync,
an LLM call, and isolated storage.

When vibe-coding a new tool, tell your assistant:

> Use the mea-ui CSS variables (`var(--bg)`, `var(--text)`, `var(--surface)`,
> `var(--border)`, `--accent`, `--radius`) and the `.mea-card / .mea-btn / .mea-input`
> helpers so it matches the meaprojects.com panel, and call the LLM via
> `window.meaprojects.llm.complete`.

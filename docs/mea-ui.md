# mea-ui — making tools look on-brand

Tools run inside a **sandboxed iframe**, so the panel's CSS does not leak into them.
To keep everything visually consistent, add `"ui": "mea"` to your `tool.json` to opt into
the **mea-ui** design layer. Without this flag the panel injects only the bridge
(`window.meaprojects`) and never touches the tool's markup, styles, or `<html data-theme>`.

## Opting in

```json
{
  "slug": "my-tool",
  "ui": "mea",
  ...
}
```

## What gets injected (only when `"ui": "mea"`)

- **Anta Trial** font (the panel's typeface), embedded as base64.
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

## Using your own design (no opt-in)

If you omit `"ui": "mea"`, the panel injects only the bridge script. Your tool
has full control over its own fonts, colors, and layout. The bridge
(`window.meaprojects`) is still available — only the visual layer is skipped.

## Design language reference (for custom designs)

If you're building your own design but want to match the panel's aesthetic:

- **Colors**: strict black & white / neutral grays only — no colored accents.
  Light background `#f0efef`, elevated `#fafafa`, text `#080808`.
  Dark: background `#0d0d0d`, text `#f0f0f0`.
- **Typography**: Light headings (`font-weight: 300`), generous letter-spacing on labels,
  uppercase small caps for metadata.
- **Shape**: Rounded corners (`12px` default, `8px` small). Generous padding.
- **Font**: Anta Trial (if you embed it yourself) or `system-ui, -apple-system, "Segoe UI", sans-serif`.

## The bridge context

```js
window.meaprojects.context // { toolSlug, theme: "light"|"dark", locale, user: { id, name } }
window.meaprojects.llm.complete({ model, messages, maxTokens })   // tek seferlik
window.meaprojects.llm.stream({ model, messages }, onChunk)       // token token akış
window.meaprojects.storage.get/set/delete/list(...)
window.meaprojects.ui.toast({ title, description, variant })
```

You never put API keys in a tool — `llm.complete` proxies through the panel, which holds
the encrypted keys and enforces the tool's declared permissions.

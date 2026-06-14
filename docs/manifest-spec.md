# Tool Manifest Spec

Her meaprojects tool'u kökünde **`tool.json`** dosyası içerir. Manifest, tool'un kimliğini, tipini, giriş noktasını ve gerekli izinleri tanımlar.

## Örnek

```json
{
  "name": "Hello Tool",
  "slug": "hello-tool",
  "version": "0.1.0",
  "description": "OpenRouter üzerinden basit bir 'merhaba' örneği.",
  "type": "static",
  "entry": "index.html",
  "icon": "icon.png",
  "ui": "mea",
  "permissions": [
    "llm:openrouter",
    "storage:local",
    "events:emit"
  ]
}
```

## Alanlar

| Alan | Zorunlu | Tip | Açıklama |
|------|---------|-----|----------|
| `name` | evet | string (1–80) | Panelde görünen ad. |
| `slug` | evet | string | URL ve klasör adı. Regex: `^[a-z0-9][a-z0-9-]{1,40}[a-z0-9]$` |
| `version` | evet | string | Semver tercih edilir. |
| `description` | hayır | string (≤ 280) | Kısa açıklama; tool kartında ve detayda görünür. |
| `type` | evet | enum | `static` \| `spa` \| `backend` |
| `entry` | evet | string | Tool kökünden göreli; `static`/`spa` için HTML, `backend` için JS giriş dosyası. Path traversal (`..`, mutlak yol) yasaktır. |
| `icon` | hayır | string | Tool kökünden göreli ikon yolu (PNG/SVG). |
| `ui` | hayır | `"mea"` | `"mea"` verilirse panel, design token'larını + `data-theme` senkronizasyonunu etkinleştirir. |
| `permissions` | hayır | string[] | Aşağıdaki tablodan değerler. |
| `backend` | sadece backend | object | `{ port?: number, env?: string[] }` — v2'de subprocess yönetimi. |

## İzinler

Her izin, bridge tarafında server-side doğrulanır. İzinsiz çağrı 403 döner.

| İzin | Açıklama |
|------|----------|
| `llm:openrouter` | `window.meaprojects.llm.complete(...)` — OpenRouter üzerinden tüm modeller |
| `storage:local` | `window.meaprojects.storage.{get,set,delete,list}` |
| `events:emit` | `window.meaprojects.events.emit(name, payload)` |
| `events:listen` | `window.meaprojects.events.on(name, handler)` |
| `jobs:write` | `meaprojects.jobs.{register,cancel,pause,resume,list}` + `meaprojects.notifications.*` |

## Tipler

- **static** — saf HTML/CSS/JS. Iframe `sandbox="allow-scripts allow-forms"`.
- **spa** — modern build (Vite/Next export vb.). Aynı sandbox, build output'u tool kökünde.
- **backend** — Node/Python yan servis. MVP'de **yalnızca tanıtım**; subprocess yönetimi `TODO(v2)`. Backend tool'lar listede görünür, çalıştır butonu pasiftir.

## Paketleme

- Tool dosyalarını bir zip içine koy. Manifest dosyası (`tool.json`) zip kökünde veya tek bir ortak alt klasör altında olabilir.
- Maks. zip boyutu: 50 MB.
- Zip içinde `..` veya mutlak yol içeren entry varsa yükleme reddedilir.

## Kurulum

`POST /api/tools` (multipart `file=`) → staging dizinine açılır → manifest doğrulanır → `tools/{slug}/` altına taşınır → DB'ye `Tool` kaydı düşer. Aynı slug varsa **upsert** olur (eski dosyalar silinir, yenisi yazılır).

## Yetkili olmayanları yakalamak için

Yüklerken kullanıcıya **izinler ekranı** gösterilir; onaylanmayan tool kurulmaz.

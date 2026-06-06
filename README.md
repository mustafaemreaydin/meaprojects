# meaprojects

Kişisel, self-hosted bir AI tool yönetim paneli. Tek kullanıcılı; tool'ları zip olarak yükle, panelden çalıştır, kendi LLM anahtarlarını kullan.

## Hızlı kurulum

```bash
npm install
cp .env.example .env
# .env'yi düzenle: NEXTAUTH_SECRET, SETTINGS_ENCRYPTION_KEY, ADMIN_EMAIL, ADMIN_PASSWORD
npx prisma generate
npx prisma migrate dev --name init
npm run seed
npm run dev
```

`http://localhost:3000` → `/login` → `.env`'deki kimliklerle giriş.

### Gerekli env değişkenleri

| Değişken | Açıklama |
|----------|----------|
| `DATABASE_URL` | `file:./data/meaprojects.db` (varsayılan SQLite). |
| `NEXTAUTH_SECRET` | NextAuth oturum imzası. `openssl rand -base64 32` ile üret. |
| `SETTINGS_ENCRYPTION_KEY` | 64 hex karakter (32 byte). API key'leri şifrelemek için. `openssl rand -hex 32`. |
| `ADMIN_EMAIL` | İlk kullanıcının e-postası. |
| `ADMIN_PASSWORD` | İlk kullanıcının parolası (seed sırasında bcrypt'lenir). |
| `ADMIN_NAME` | (opsiyonel) Görünen ad. |
| `LLM_RATE_LIMIT_PER_MIN` | (opsiyonel, varsayılan 30) Tool başına dakikalık LLM çağrı limiti. |

## Stack

- Next.js 14 App Router + TypeScript strict
- Tailwind CSS + CSS değişkenli design tokens + `next-themes`
- Prisma 5 + SQLite
- NextAuth Credentials (JWT)
- Radix UI primitives + cmdk + sonner
- LLM adapters: Anthropic SDK, OpenAI SDK (Google v2'de)

## Komutlar

| Komut | Ne yapar |
|-------|----------|
| `npm run dev` | Dev sunucusu (Next + HMR). |
| `npm run build` / `npm start` | Production build / run. |
| `npm run typecheck` | `tsc --noEmit`. |
| `npm run seed` | `.env`'den admin kullanıcısı oluşturur (varsa atlar). |
| `npm run db:generate` | Prisma client'ı yeniden üretir. |
| `npm run db:migrate` | `prisma migrate dev`. |
| `npm run db:studio` | Prisma Studio. |

## Klasör yapısı

```
app/
  (auth)/login            Giriş ekranı
  (panel)/                Sidebar + topbar ile korunan sayfalar
    dashboard
    tools/                Liste, upload, detay
    logs                  ToolRun + LlmCall birleşik
    settings/             Hesap, API Keys, Görünüm, Gelişmiş
    docs                  Markdown render
  (immersive)/tools/[slug]/run    Sandbox'lı tool çalıştırıcı
  api/
    auth/[...nextauth]
    tools, tools/[slug], tools/[slug]/file/[...path]
    bridge/{llm,storage}
    settings, settings/test-key, settings/advanced
lib/
  llm/                    provider-agnostik wrapper (anthropic, openai, google stub)
  tools/                  manifest schema, zip, registry, path utils
  bridge/                 inject script + handlers + origin check
  auth, db, crypto, utils, rate-limit, permissions
prisma/                   schema + seed
components/{ui,panel,tools,shared}
docs/                     manifest-spec.md, bridge-api.md (panel içinde render edilir)
examples/hello-tool/      referans örnek
public/                   logo PNG'leri, logo-mark.svg, fonts/
styles/                   globals.css, fonts.css
tools/                    runtime: kurulan tool dosyaları (.gitignore'da)
data/                     runtime: SQLite dosyası (.gitignore'da)
```

## Tool yazma

Detay: [`docs/manifest-spec.md`](docs/manifest-spec.md) (manifest şeması) ve [`docs/bridge-api.md`](docs/bridge-api.md) (`window.meaprojects` API'si). Çalışan minimal örnek: [`examples/hello-tool/`](examples/hello-tool/).

Hızlı özet:

1. `tool.json` ile `index.html` (veya SPA build çıktın) içeren bir klasörü zip'le.
2. Panel → Tool'lar → Yeni tool yükle. İzinleri onayla.
3. Tool, iframe içinde **`sandbox="allow-scripts allow-forms"`** ile çalışır (`allow-same-origin` yok).
4. `window.meaprojects.llm.complete(...)` çağrısı `/api/bridge/llm`'e gider; API key sunucuda kalır.
5. `window.meaprojects.storage.{get,set,delete,list}` çağrıları tool başına izole edilir.

## Güvenlik notları

- API anahtarları `Setting` tablosunda AES-256-GCM ile şifrelenir.
- Iframe sandbox'ından `allow-same-origin` çıkarılmıştır; cookie/origin sızıntısı yok.
- Tüm bridge `postMessage` istekleri `event.origin === window.location.origin` kontrolünden geçer.
- Manifest'te beyan edilmeyen izinler 403 ile reddedilir.
- Zip içinde `..` veya mutlak yol içeren entry'ler reddedilir; max 50 MB.
- LLM çağrılarına tool başına dakikada 30 token'lık bucket (env ile değiştirilebilir).
- Backend tool tipi MVP'de **iskelet**: subprocess yönetimi `TODO(v2)`, çalıştır butonu pasif.

## v2 yol haritası

- Backend tool subprocess yönetimi (`127.0.0.1` bind, port havuzu, log toplama).
- Google (Gemini) provider tam implementasyonu.
- Tool storage / log export-import.
- Çoklu kullanıcı + rol modeli (gerekirse).
- `i18n` için EN çeviri seti.

## Lisans

Kişisel kullanım. Üçüncü taraf SDK'ların kendi lisansları geçerlidir.

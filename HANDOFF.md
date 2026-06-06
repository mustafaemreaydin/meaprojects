# HANDOFF — meaprojects.com

> **Bu proje devam ettirilmelidir.** Bu doküman, projeye senden sonra devam edecek bir
> yazılımcı veya yapay zeka modeli için yazılmıştır. Mevcut durumu, mimariyi,
> konvansiyonları ve **yapılması gerekenleri** içerir. Lütfen değişiklik yapmadan önce
> bu dosyanın tamamını oku; iş bittikçe "Yapılacaklar" bölümünü güncel tut.

Son güncelleme: 2026-06-06

---

## 1. Proje nedir?

`meaprojects.com` — Mustafa Emre Aydın'ın kişisel **AI laboratuvarı + paylaşımlı tool
platformu**. Amaç:
1. "Vibe coding" ile geliştirilen tool'ları tek panelden, her yerden erişime açmak.
2. Bulutta sürekli aktif tutmak.
3. Seçili kişilere, admin'in tanımladığı giriş bilgileriyle, **yalnızca yetki verilen**
   tool'ları deneyimletmek.
- Ticari amaç yok. İletişim: **mustafaemreaydin@yandex.com**

İki kullanıcı tipi:
- **admin** (Mustafa) — sistemin tam kontrolü (dashboard, tool yönetimi, kullanıcılar, loglar, ayarlar).
- **member** (davetli) — admin'in oluşturduğu hesap; yalnızca yetki verilen tool'ları `/apps`'te görür/çalıştırır.

Her tool'un kendi **subdomain**'i olabilir: `toolslug.meaprojects.com` → oturum + yetki kontrolüyle doğrudan o tool.

---

## 2. Teknoloji

- **Next.js 14** (App Router) + TypeScript + Tailwind CSS 3
- **NextAuth** (Credentials provider, JWT session) — `lib/auth.ts`
- **Prisma + SQLite** (`prisma/schema.prisma`, DB: `prisma/data/meaprojects.db`)
- Font: **Anta Trial** (`public/fonts/AntaTrial-*.ttf`, `styles/fonts.css`)
- Tema: `next-themes`, varsayılan **dark**
- İsimlendirme: Tüm `iknalab` referansları **meaprojects** olarak yeniden adlandırıldı
  (paket adı, DB dosyası `meaprojects.db`, bridge global `window.meaprojects`, protokol
  işaretleri `__meaprojects__` / `x-meaprojects-tool` / `data-meaprojects-*`, dokümanlar).
  **Tek istisna:** kök klasör adı disk üzerinde hâlâ `iknalab` olabilir — bu, oturumun
  çalıştığı canlı çalışma dizini olduğu için süreç içinden güvenle değiştirilemez. Kapatınca
  klasörü `meaprojects` yap (tüm yollar göreceli olduğu için sonrasında sorunsuz çalışır).

---

## 3. Çalıştırma & doğrulama

```bash
npm install
npx prisma generate
npx prisma migrate deploy      # veya: npx prisma migrate dev
npm run seed                   # .env'deki ADMIN_* ile admin oluşturur/günceller
npm run dev                    # http://localhost:3000
npx tsc --noEmit               # tip kontrolü (her değişiklikten sonra çalıştır)
```

Admin giriş (local): `.env` içindeki `ADMIN_EMAIL` / `ADMIN_PASSWORD`
(şu an: `mustafa@meaprojects.com` / `Ae196761`).

**Önemli (Windows):** `prisma generate` çalışan dev server DLL'i kilitliyse `EPERM` verir —
önce dev server'ı durdur, sonra generate et.

**Önizleme/test:** Bu projede `.claude/launch.json` var; Claude Preview MCP araçlarıyla
(`preview_start` adı "dev") tarayıcıda doğrulama yapılabilir. Sandbox iframe içeren sayfalarda
(`/tools/<slug>/run`) `preview_screenshot` takılabilir — bu bir araç kısıtı, uygulama hatası
değil; `preview_eval` ile DOM kontrol et.

---

## 4. Veri modeli (`prisma/schema.prisma`)

- **User** `{ id, email, password(bcrypt), name, role("admin"|"member"), createdAt, toolAccess[] }`
- **Tool** `{ slug(unique), name, version, description, icon, type("static"|"spa"|"backend"),
  manifest(JSON), permissions(JSON[]), status("installed"|"disabled"|"error"),
  access("private"|"granted"|"public"), grants[] , ... }`
- **ToolAccess** `{ userId, toolId, @@unique }` — member'a tool-bazlı erişim verir
- **ContactRequest** `{ name, email, message, createdAt }` — landing iletişim formu
- **ToolStorage**, **ToolRun**, **LlmCall**, **Setting** — mevcut (tool storage, çalıştırma/LLM logları, şifreli ayarlar)

Erişim kuralı (`lib/access.ts` → `canAccessTool`): admin → her şey; member → `access==="public"`
**veya** ilgili `ToolAccess` kaydı varsa.

---

## 5. Mimari — kritik dosyalar

### Kimlik & erişim
- `lib/auth.ts` — NextAuth; JWT/session'a `role` claim'i; **prod'da** `COOKIE_DOMAIN`
  (`.meaprojects.com`) ile subdomain'ler arası SSO cookie'si.
- `lib/access.ts` — `getCurrentUser()`, `requireAdmin()`, `canAccessTool()`,
  `listAccessibleTools()`. **Server tarafında yetki için her zaman bunları kullan.**
- `types/next-auth.d.ts` — session/JWT `role` tip genişletmesi.
- `middleware.ts` — iki iş yapar:
  1. **Subdomain yönlendirme:** `slug.<apex>` / `slug.localhost` → iç route `/_tool/<slug>`'a
     rewrite; oturum yoksa apex `/login?callbackUrl=...`'a yönlendir.
  2. **Rol-kapısı:** apex'te `/dashboard /logs /settings /admin /docs` ve `/tools` (run hariç)
     yalnızca admin; member denerse `/apps`'e yönlenir. (API'ler ayrıca handler'larda
     `requireAdmin` ile korunur — savunma derinliği.)

### Sayfalar (App Router grupları)
- `app/page.tsx` — **landing** (hero "My personal AI workspace.", features, how-it-works,
  CTA, **contact** section, footer imzası "Built by Mustafa Emre Aydın"). Three.js dot
  arkaplan + DotFlow + FeyButton.
- `app/(auth)/login/` — giriş; sol panelde **SpiralAnimation**, "Back to home" linki,
  rol-bazlı yönlendirme (admin→/dashboard, member→/apps).
- `app/(panel)/` — oturumlu shell (sidebar + topbar). `layout.tsx` rol'ü `Sidebar`'a geçirir.
  - `dashboard/` — **admin kontrol paneli** (member denerse /apps'e redirect).
  - `apps/` — **tool launcher galerisi** (herkes; access'e göre filtreli). Subdomain linki
    `NEXT_PUBLIC_APP_DOMAIN` set ise gösterilir.
  - `tools/` — admin tool yönetimi (yükle/etkinleştir/sil/access ayarı).
  - `admin/users/` — üye oluştur/parola sıfırla/sil + tool erişim grid'i.
  - `admin/requests/` — contact talep gelen kutusu.
  - `logs/`, `settings/`, `docs/` — admin.
- `app/(immersive)/tools/[slug]/run/` — tool runner (sandbox iframe). Access kontrollü.
- `app/(subtool)/_tool/[slug]/` — subdomain'den gelen istekte render edilen tam ekran runner.
- `app/not-authorized/` — 403 sayfası (yetkisiz tool erişimi).

### Tool runtime & bridge
- `lib/tools/registry.ts` — zip'ten kurulum (`tools/<slug>/`'a açar). **Backend tool
  (subprocess) henüz yok — v2 TODO burada.**
- `app/api/tools/[slug]/file/[...path]/route.ts` — tool dosyalarını sunar; `index.html`'e
  **mea-ui katmanı + bridge** enjekte eder; access kontrollü; `parentOrigin` request'ten
  türetilir (apex/subdomain ikisinde de çalışır).
- `lib/bridge/inject.ts` — `window.meaprojects` bridge script'i + **mea-ui tasarım katmanı**
  (`buildDesignTokensStyle()`: Anta Trial font, `--bg/--text/--surface/--border/--accent/--radius`
  token'ları, light+dark, `data-theme`, `.mea-card/.mea-btn/.mea-input`). Tema canlı senkron.
- `components/panel/bridge-relay.tsx` — panel tarafı; iframe postMessage'larını `/api/bridge/*`'a
  proxy'ler; tema değişince tool'a `theme` event'i gönderir.
- `app/api/bridge/llm`, `app/api/bridge/storage` — bridge handler'ları (session bazlı; member'lar
  yetkili tool çalıştırırken kullanır). LLM çağrısı `{provider, model, messages, maxTokens}` ister.

### Tasarım sistemi (görsel dil — koru!)
- **Sıkı siyah-beyaz** palet (renk aksanı yok). Token'lar `styles/globals.css` `:root` /
  `[data-theme="dark"]`.
- Font: **Anta Trial** (`font-light` büyük başlıklar, sıkı letter-spacing).
- Butonlar: `components/ui/fey-button.tsx` (**FeyButton** — radial gradient + inset border +
  hover glow; `forceDark`/`forceLight` props). Eski StarButton/ShinyButton **silindi** —
  yeniden ekleme.
- Section etiketleri: `text-[11px] uppercase tracking-[0.18em] text-text-muted`.
- Kartlar: `rounded-2xl border border-[var(--border)] bg-[var(--surface)]`.
- Animasyonlar: `components/ui/dotted-surface.tsx` (Three.js), `dot-flow.tsx`+`dot-loader.tsx`
  (state-tabanlı, GSAP'siz — **tekrar GSAP'e geçme, StrictMode'da kırılıyordu**),
  `spiral-animation.tsx` (login; noktalar küçük/uniform — `radius = min(max(sw*0.5,0.7),1.0)`).
- Logo: `components/shared/logo.tsx` (`size="sm|md|lg"`, `light` prop). PNG'ler
  `public/mea-dark.png` / `public/mea-white.png` (1192×540 — inline `style` ile boyutlanır).

### Geliştiriciye yardımcılar
- `starter-tool/` — on-brand örnek tool (index.html + tool.json). Zip'le → Tools→Upload.
  Kurulu örnek `tools/mea-starter/` ve DB'de `access="public"`.
- `scripts/install-starter.ts` — starter'ı HTTP'siz kuran tek seferlik yardımcı
  (`npx tsx scripts/install-starter.ts`).
- `docs/mea-ui.md`, `docs/manifest-spec.md`, `docs/bridge-api.md` — tool yazımı referansı
  (panelde Docs sekmesinde).
- `DEPLOY.md` — **prod kurulum rehberi** (VPS + Docker + Caddy wildcard TLS, env'ler, DNS).

---

## 6. Bu oturumda yapılanlar (özet)

1. **Görsel kimlik:** meaprojects → **meaprojects.com**; logo (mea PNG), font (TT Artnik →
   Anta Trial), tam siyah-beyaz palet, dark varsayılan, tüm UI İngilizce.
2. **Landing page** (Three.js dot arkaplan, DotFlow göstergesi, FeyButton, contact bölümü,
   imza). "My personal AI workspace."
3. **Login** yeniden tasarım (SpiralAnimation, back-to-home, FeyButton submit).
4. **Dashboard** yeniden tasarım (zaman-duyarlı selamlama, metrik kartları, quick actions).
5. **Platform mimarisi (5 faz):** roller & erişim kontrolü, admin kullanıcı yönetimi +
   talep kutusu, tool launcher galerisi, rol-bazlı nav, subdomain yönlendirme + SSO,
   `DEPLOY.md`.
6. **mea-ui:** tool'lara otomatik on-brand tasarım katmanı + canlı tema senkronu + starter
   + docs.
7. **Düzeltmeler:** docs RSC bug, ThemeToggle hydration mismatch, çeşitli erişim sızdırmaları.

Plan dosyası: `~/.claude/plans/wobbly-hugging-matsumoto.md` (onaylı plan).

---

## 7. YAPILACAKLAR (devam ettirilmeli) — öncelik sırasıyla

> Proje **yarım değil ama tamamlanmış da değil**; aşağıdakiler vizyonun kalan parçaları.

1. **Prod deploy + subdomain'i gerçek ortamda doğrula** (`DEPLOY.md`'yi izle).
   - `COOKIE_DOMAIN=".meaprojects.com"` ve `NEXT_PUBLIC_APP_DOMAIN="meaprojects.com"` set et.
   - Wildcard DNS + TLS kur, `slug.meaprojects.com` akışını uçtan uca test et.
   - **Neden:** Subdomain SSO local'de doğrulanamıyor (localhost cookie izolasyonu); kod hazır
     ama gerçek doğrulama prod'da.
2. **API anahtarı + canlı LLM testi.** Settings → API Keys'ten Anthropic anahtarı ekle;
   starter tool'dan `llm.complete` çağrısını canlı dene. (Adapter'lar: `lib/llm/*`.)
3. **Backend tool desteği (v2).** `lib/tools/registry.ts`'teki TODO: `type:"backend"` tool'lar
   için container/port yönetimi + reverse proxy entegrasyonu. Erişim modeli aynı kalır.
4. **Contact için e-posta bildirimi.** Şu an talep yalnızca DB'ye yazılıyor. nodemailer + SMTP
   env ile admin'e e-posta (opsiyonel).
5. **Davetle kayıt akışı.** Şu an admin parolayı doğrudan belirliyor. Tek-kullanımlık davet
   linki + üyenin kendi parolasını belirlemesi eklenebilir.
6. **Bridge LLM erişim sertleştirmesi.** `/api/bridge/llm` şu an session bazlı; member doğrudan
   yetkisiz tool slug'ıyla çağırabilir. `handlers.ts`'e `canAccessTool` kontrolü eklenebilir
   (savunma derinliği; runner + file route zaten korumalı).
7. **Contact taleplerini silme/işaretleme** (admin requests kutusunda) — küçük UX.
8. (Opsiyonel) **`meaprojects` → `mea` yeniden adlandırma** — bridge API `window.meaprojects`, DB dosya
   adı, klasör adı. Riskli/geniş; ayrı görev olarak planla, tek seferde yapma.

---

## 8. Konvansiyonlar & uyarılar (bunlara uy)

- **Yetki:** Server'da daima `lib/access.ts` yardımcıları; client'ta UI'yı role göre gizle ama
  **asla** client'a güvenme — gerçek kapı server + middleware.
- **Görsel dil:** Sıkı B&W, Anta Trial, FeyButton, uppercase tracking etiketler, `rounded-2xl`
  kartlar, `var(--*)` token'ları. Renkli aksan/yeni font ekleme.
- **Animasyon:** DotLoader/DotFlow saf React state ile yazıldı — **GSAP geri getirme**
  (StrictMode çift-mount'ta interval kırılıyordu).
- **Tema:** `next-themes`, dark varsayılan. Tema bağımlı ikon/render'ı `mounted` guard ile
  yap (hydration mismatch önlemek için — bkz. `theme-toggle.tsx`).
- **Her değişiklikten sonra `npx tsc --noEmit` çalıştır.** Mümkünse Preview MCP ile tarayıcıda
  doğrula (özellikle auth akışları, rol kapıları).
- **Tool'lar sandbox iframe'de** (`allow-same-origin` yok — güvenlik). Panel CSS'i sızmaz;
  on-brand görünüm mea-ui token enjeksiyonuyla gelir.
- Yorum/metin dili: kod İngilizce, kullanıcı iletişimi Türkçe. Mevcut karışık Türkçe yorumlar
  korunabilir.

---

## 9. Hızlı dosya haritası

```
app/
  page.tsx                       landing
  (auth)/login/                  giriş (+ spiral, contact-form yok burada)
  contact-form.tsx               landing contact formu (client)
  (panel)/
    layout.tsx  dashboard/  apps/  tools/  logs/  settings/  docs/
    admin/users/  admin/requests/
  (immersive)/tools/[slug]/run/  in-panel runner
  (subtool)/_tool/[slug]/        subdomain runner
  not-authorized/
  api/
    contact/  admin/users/  admin/users/[id]/  admin/tool-access/
    tools/  tools/[slug]/  tools/[slug]/file/[...path]/
    settings/  settings/test-key/  settings/advanced/
    bridge/llm/  bridge/storage/  auth/[...nextauth]/
lib/
  auth.ts  access.ts  db.ts  crypto.ts  rate-limit.ts  permissions.ts
  tools/{registry,manifest,paths,zip}.ts
  bridge/{inject,relay-handlers...}.ts  llm/*
  bridge/inject.ts               ← mea-ui katmanı + bridge script
components/
  ui/{fey-button,dotted-surface,dot-flow,dot-loader,spiral-animation, ...}.tsx
  panel/{sidebar,topbar,command-palette,theme-toggle,bridge-relay}.tsx
  shared/{logo,theme-provider,session-provider}.tsx
  tools/{tool-card,metric-card,tool-uploader,sparkline}.tsx
middleware.ts  prisma/schema.prisma  prisma/seed.ts
styles/{globals,fonts}.css
starter-tool/  scripts/install-starter.ts
docs/{mea-ui,manifest-spec,bridge-api}.md
DEPLOY.md  HANDOFF.md (bu dosya)
```

---

Sorular / iletişim: **mustafaemreaydin@yandex.com** (proje sahibi: Mustafa Emre Aydın).
Bu proje aktif geliştirme altındadır — lütfen yukarıdaki "Yapılacaklar"dan devam et.

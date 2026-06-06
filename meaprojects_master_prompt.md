# meaprojects — Master Build Prompt

> Bu dosyayı Claude Code, Cursor veya benzeri bir AI coding aracına ver. Tek seferde tam proje iskeletini ve ilk sürümü çıkarması için tasarlandı.

---

## ROL VE BAĞLAM

Sen kıdemli bir full-stack mühendis ve ürün tasarımcısısın. Sana **meaprojects** adında, kişisel kullanıma yönelik, self-hosted bir AI tool yönetim paneli inşa edeceksin. Mantık olarak WordPress'in plugin sistemine benziyor: kullanıcı kendi ürettiği "AI tool"ları zip olarak yüklüyor, panel onları kurup yönetiyor, tek bir arayüzden çalıştırıyor. Ama görsel ve UX olarak WordPress'in tam zıttı — **2026'nın modern, hızlı, ferah, kullanıcı odaklı bir panel** olacak. Linear, Vercel Dashboard, Raycast ve Arc tarayıcı seviyesinde rafinasyon hedefliyoruz.

Bu, üretime hazır kod olmalı. "Demo" veya "placeholder" zihniyetiyle yazma. Her detay düşünülmüş, her boşluk amaçlı, her animasyon anlamlı olmalı.

---

## 1. ÜRÜN MANTIĞI

### 1.1 Temel kavram
- **Panel (Core):** meaprojects'in kendisi. Kullanıcı yönetimi, tool yönetimi, ayarlar, ortak servisler.
- **Tool (Plugin):** Kullanıcının ürettiği bağımsız mini uygulamalar. Zip olarak yüklenir, panel altında çalışır.
- **Manifest:** Her tool zip'inin kökünde bulunan `tool.json`. Tool'un kimliğini, tipini ve panelle olan sözleşmesini tanımlar.

### 1.2 Tool tipleri (üçü de desteklenecek)
1. **`static`** — Sadece HTML+CSS+JS. `index.html` açılır, iframe içinde çalışır.
2. **`spa`** — Önceden build edilmiş React/Vue/Svelte çıktısı. `index.html` + asset'ler. Yine iframe'de.
3. **`backend`** — Python veya Node servisi içeren tool'lar. Panel subprocess olarak yönetir, `/api/tools/{slug}/*` altında proxy'ler. **MVP'de iskeleti hazır olacak ama tam fonksiyonu v2'ye bırakılacak — net TODO'lar bırak.**

### 1.3 Manifest sözleşmesi (`tool.json`)
```json
{
  "slug": "metin-ozetleyici",
  "name": "Metin Özetleyici",
  "version": "1.0.0",
  "description": "Uzun metinleri tek tıkla özetler.",
  "icon": "icon.svg",
  "type": "static",
  "entry": "index.html",
  "author": "kullanici",
  "permissions": ["llm:anthropic", "storage:local"],
  "backend": {
    "runtime": "python3.11",
    "start": "uvicorn app:app --host 127.0.0.1 --port $PORT",
    "requirements": "requirements.txt",
    "healthcheck": "/health"
  },
  "category": "metin",
  "tags": ["özet", "nlp"]
}
```
- `slug` → kebab-case, benzersiz, URL-safe.
- `permissions` → tool'un panelden hangi yetkileri istediğini deklare eder. Kullanıcı kurarken görür ve onaylar.
- `backend` alanı sadece `type: "backend"` ise zorunlu.

### 1.4 Panel ↔ Tool köprüsü (`window.meaprojects` API'si)
Tool iframe'inin içinde global bir köprü nesnesi enjekte edilecek. `postMessage` üzerinden çalışacak ama tool geliştiricisi `postMessage`'a hiç dokunmayacak. Sözleşme:

```js
// Tool içinden çağrılabilecek API'ler
window.meaprojects = {
  // LLM çağrıları (API key tool'a sızmaz, panel proxy'ler)
  llm: {
    complete: async ({ provider, model, messages, ...opts }) => { ... },
    stream:   async ({ provider, model, messages, ...opts }, onChunk) => { ... }
  },
  // Tool'a özel kalıcı storage (panel SQLite'ında izole şekilde tutulur)
  storage: {
    get:    async (key) => { ... },
    set:    async (key, value) => { ... },
    delete: async (key) => { ... },
    list:   async (prefix) => { ... }
  },
  // Tool'lar arası event bus (opt-in, izin gerekli)
  events: {
    emit:    (eventName, payload) => { ... },
    on:      (eventName, handler) => { ... },
    off:     (eventName, handler) => { ... }
  },
  // Panel meta bilgileri
  context: {
    toolSlug:  "metin-ozetleyici",
    theme:     "light" | "dark",
    locale:    "tr",
    user:      { id, name }
  },
  // UI yardımcıları (panelin toast'unu, modal'ını kullanmak için)
  ui: {
    toast:   ({ title, description, variant }) => { ... },
    confirm: async ({ title, message }) => boolean
  }
};
```
Bu API açıkça **kullanıcı dokümantasyonunda** anlatılmalı (panel içinde `/docs` sayfası).

### 1.5 Zip yükleme akışı
1. Kullanıcı `.zip` yükler.
2. Backend zip'i geçici klasöre çıkarır.
3. `tool.json` doğrulanır (zod şeması). Hatalıysa anlamlı hata mesajıyla reddedilir.
4. `slug` çakışıyorsa kullanıcıya "güncelle / iptal et" sorulur. Güncellemede versiyon karşılaştırılır.
5. `permissions` ekranı gösterilir — kullanıcı onaylar.
6. Tool `./tools/{slug}/` altına taşınır, DB'ye kaydedilir (status: `installed`).
7. `type: "backend"` ise virtualenv/npm install yapılır, port atanır, servis ayağa kaldırılır. (MVP'de iskelet + TODO).
8. Tool listesine eklenir, kullanıcı çalıştırabilir.

### 1.6 MVP scope (bu sürümde olacaklar)
- Auth (tek kullanıcı, JWT). Login + logout.
- Dashboard (özet metrikler, son kullanılan tool'lar, kurulu tool sayısı, hızlı erişim).
- Tools listesi (kart görünümü, arama, filtreleme).
- Tool yükleme (drag-drop zip).
- Tool çalıştırma (iframe runner, fullscreen modu, geri butonu).
- Tool detay sayfası (versiyon, izinler, sil, devre dışı bırak, yeniden yükle).
- Settings: API keys (Anthropic, OpenAI, Google), tema, dil, hesap.
- `window.meaprojects` köprüsü (statik+spa için tam çalışır).
- Logs sayfası (tool çalıştırma geçmişi, LLM çağrı geçmişi, token kullanımı).
- Docs sayfası (manifest formatı + `window.meaprojects` API referansı, panel içinde).
- Backend tool subprocess yönetimi → **iskelet + TODO yorumları**, MVP'de devre dışı.

---

## 2. TEKNİK STACK

- **Framework:** Next.js 14 (App Router, TypeScript, strict mode).
- **UI:** Tailwind CSS + shadcn/ui (özelleştirilmiş, aşağıdaki tasarım sistemine uyarlanmış).
- **DB:** SQLite + Prisma ORM. Tek dosya (`./data/meaprojects.db`).
- **Auth:** `next-auth` (Credentials provider, tek kullanıcı, JWT session).
- **State:** React Server Components + minimum client state. Karmaşık client state için Zustand.
- **Form:** `react-hook-form` + `zod`.
- **Animation:** `motion` (eski Framer Motion) — sadece anlamlı yerlerde.
- **Icon:** `lucide-react`.
- **File handling:** `adm-zip` veya `unzipper` (server-side).
- **LLM SDK:** `@anthropic-ai/sdk`, `openai`. Provider-agnostic bir wrapper yaz (`lib/llm/index.ts`).
- **Toast:** `sonner`.
- **Tablo:** `@tanstack/react-table` (Logs ve Tools listesi için).
- **Dosya yapısı:** Klasik Next.js App Router yapısı. `app/`, `components/`, `lib/`, `prisma/`, `tools/` (kurulu tool'ların yaşadığı yer), `public/`.

### 2.1 Klasör yapısı
```
meaprojects/
├── app/
│   ├── (auth)/login/page.tsx
│   ├── (panel)/
│   │   ├── layout.tsx              # sidebar + topbar
│   │   ├── dashboard/page.tsx
│   │   ├── tools/
│   │   │   ├── page.tsx            # liste
│   │   │   ├── upload/page.tsx     # yükleme
│   │   │   ├── [slug]/page.tsx     # detay
│   │   │   └── [slug]/run/page.tsx # çalıştırma (iframe)
│   │   ├── logs/page.tsx
│   │   ├── settings/
│   │   │   ├── page.tsx
│   │   │   ├── api-keys/page.tsx
│   │   │   └── account/page.tsx
│   │   └── docs/page.tsx
│   ├── api/
│   │   ├── auth/[...nextauth]/route.ts
│   │   ├── tools/
│   │   │   ├── route.ts            # GET (list), POST (upload)
│   │   │   ├── [slug]/route.ts     # GET, PATCH, DELETE
│   │   │   └── [slug]/run/route.ts # SSE/proxy
│   │   ├── bridge/
│   │   │   ├── llm/route.ts        # window.meaprojects.llm proxy'si
│   │   │   └── storage/route.ts    # window.meaprojects.storage proxy'si
│   │   └── settings/route.ts
│   └── layout.tsx
├── components/
│   ├── ui/                         # shadcn/ui özelleştirilmiş
│   ├── panel/                      # Sidebar, Topbar, BreadCrumb
│   ├── tools/                      # ToolCard, ToolUploader, ToolRunner
│   └── shared/                     # Logo, EmptyState, vs.
├── lib/
│   ├── llm/                        # provider-agnostic LLM client
│   ├── tools/                      # zip extract, manifest validate, registry
│   ├── bridge/                     # window.meaprojects köprüsü (inject script)
│   ├── auth.ts
│   ├── db.ts
│   └── utils.ts
├── prisma/
│   └── schema.prisma
├── tools/                          # kurulu tool'lar burada yaşar (gitignore)
├── data/                           # SQLite db (gitignore)
├── public/
│   ├── logo-dark.svg
│   └── logo-light.svg
├── styles/
│   ├── globals.css
│   └── fonts.css                   # TT Artnik @font-face
└── ...
```

### 2.2 Prisma şeması (özet)
```prisma
model User {
  id        String  @id @default(cuid())
  email     String  @unique
  password  String  // hash
  name      String?
  createdAt DateTime @default(now())
}

model Tool {
  id           String  @id @default(cuid())
  slug         String  @unique
  name         String
  version      String
  description  String?
  icon         String?
  type         String  // "static" | "spa" | "backend"
  manifest     String  // JSON
  permissions  String  // JSON array
  status       String  // "installed" | "disabled" | "error"
  installedAt  DateTime @default(now())
  updatedAt    DateTime @updatedAt
  storages     ToolStorage[]
  runs         ToolRun[]
}

model ToolStorage {
  id     String @id @default(cuid())
  toolId String
  key    String
  value  String // JSON
  tool   Tool   @relation(fields: [toolId], references: [id], onDelete: Cascade)
  @@unique([toolId, key])
}

model ToolRun {
  id        String   @id @default(cuid())
  toolId    String
  startedAt DateTime @default(now())
  endedAt   DateTime?
  status    String   // "running" | "completed" | "error"
  tool      Tool     @relation(fields: [toolId], references: [id], onDelete: Cascade)
}

model LlmCall {
  id         String   @id @default(cuid())
  toolSlug   String?
  provider   String
  model      String
  inputTokens  Int
  outputTokens Int
  costUsd    Float?
  createdAt  DateTime @default(now())
}

model Setting {
  key   String @id
  value String // şifrelenmiş JSON
}
```

---

## 3. TASARIM SİSTEMİ (KESİN VE BAĞLAYICI)

Bu kısım sıkı kurallı. AI üretirken "yakın bir renk" kullanmasın, **tam olarak bu değerleri** kullanacak.

### 3.1 Renk paleti
```css
--ink-900: #0B1323;   /* ana metin, koyu yüzey, sidebar arka planı (dark mode'da panel bg) */
--paper:   #F0EFEF;   /* arka plan, açık yüzey (light mode body bg) */
--mist:    #99B8DE;   /* marka aksanı, ikincil aksiyon, badge, link */

/* Türetilmiş tonlar — bu üçünden çıkacak, dışarıdan renk eklenmeyecek */
--ink-800: #142038;
--ink-700: #1E2D4A;
--ink-600: #2A3B5C;
--ink-500: #3E5278;
--ink-400: #6B7F9C;
--ink-300: #9AAAC2;
--ink-200: #C7D1DE;
--ink-100: #E4E9F0;

--paper-50:  #FAFAFA;
--paper-100: #F0EFEF;
--paper-200: #E5E4E4;
--paper-300: #D4D3D3;

--mist-50:   #EEF3FA;
--mist-100: #D9E4F2;
--mist-200: #BFD1E8;
--mist-300: #99B8DE;   /* ana */
--mist-400: #7AA0D0;
--mist-500: #5C88C2;
--mist-600: #4670A8;

/* Anlamsal */
--success: #4F9B6B;
--warning: #C99654;
--danger:  #C25B5B;

/* Light mode */
--bg:           var(--paper-100);
--bg-elevated:  var(--paper-50);
--surface:      #FFFFFF;
--border:       var(--ink-100);
--text:         var(--ink-900);
--text-muted:   var(--ink-400);
--accent:       var(--mist-300);
--accent-hover: var(--mist-400);

/* Dark mode */
--bg:           var(--ink-900);
--bg-elevated:  var(--ink-800);
--surface:      var(--ink-700);
--border:       var(--ink-600);
--text:         var(--paper-100);
--text-muted:   var(--ink-300);
--accent:       var(--mist-300);
--accent-hover: var(--mist-200);
```

**Renk kullanım kuralı:** Hiçbir ekran üç ana renk dışına çıkmayacak. Mor gradient, neon, pastel cıvıltı yok. Mist (açık mavi) sadece **vurgu** için — primer butonlar, aktif sidebar item, focus halkası, marka logosu. Hiçbir zaman büyük yüzeylerde fon olarak kullanılmayacak. Yüzeylerin %90'ı paper/ink, %10'u mist.

### 3.2 Tipografi
**Font: TT Artnik** (kullanıcı sağlayacak. `styles/fonts.css`'te `@font-face` ile tanımla, `public/fonts/` altına koyma talimatı yaz).

```css
@font-face {
  font-family: 'TT Artnik';
  src: url('/fonts/TTArtnik-Regular.woff2') format('woff2');
  font-weight: 400;
  font-display: swap;
}
@font-face {
  font-family: 'TT Artnik';
  src: url('/fonts/TTArtnik-Medium.woff2') format('woff2');
  font-weight: 500;
  font-display: swap;
}
@font-face {
  font-family: 'TT Artnik';
  src: url('/fonts/TTArtnik-Bold.woff2') format('woff2');
  font-weight: 700;
  font-display: swap;
}
```

Fallback: `'TT Artnik', system-ui, -apple-system, sans-serif`.

**Tipografi skalası:**
- `display-xl`: 56px / 1.05 / -0.03em / 700
- `display`:    44px / 1.1 / -0.025em / 700
- `h1`:         32px / 1.2 / -0.02em / 600
- `h2`:         24px / 1.3 / -0.015em / 600
- `h3`:         18px / 1.4 / -0.01em / 500
- `body-lg`:    16px / 1.6 / 400
- `body`:       14px / 1.6 / 400
- `caption`:    12px / 1.4 / 500 / +0.02em / uppercase (etiketler için)
- `mono`:       JetBrains Mono fallback, sadece kod/slug/teknik değerler için

### 3.3 Boşluk ve ölçü sistemi
4px tabanlı: `4, 8, 12, 16, 20, 24, 32, 40, 48, 64, 80, 96`.
**Sidebar:** 260px (collapsed 64px).
**Topbar:** 56px.
**İçerik max-width:** 1280px, ana padding 32px (mobilde 16px).
**Border radius:** `4px` (input/badge), `8px` (button/card), `12px` (panel/modal), `16px` (large surface). Hiçbir yerde tam yuvarlak yok (pill button hariç).

### 3.4 Gölge ve derinlik
Light mode'da çok az gölge — derinlik **border** ile verilecek (1px `--border`).
```css
--shadow-sm: 0 1px 2px rgba(11, 19, 35, 0.04);
--shadow:    0 4px 12px rgba(11, 19, 35, 0.06);
--shadow-lg: 0 12px 32px rgba(11, 19, 35, 0.08);
--shadow-mist: 0 0 0 3px rgba(153, 184, 222, 0.25); /* focus halkası */
```
Dark mode'da gölge yerine `--ink-700` yüzeyi ile kontrast.

### 3.5 Tasarım dili — KURALLAR
1. **Ferah ama bilgi yoğun.** Linear gibi: çok bilgi gösterir ama nefes alır.
2. **Tek vurgu rengi.** Mist mavi sadece aktif/seçili/önemli olanda. Her şey aksanlıysa hiçbir şey aksanlı değildir.
3. **Border-driven, shadow-free.** Kartlar, panel'ler hairline border (1px) ile ayrılır. Yüzen kartlar yok, hepsi mizanpajın parçası.
4. **Asimetrik denge.** Sayfa içi mizanpaj asla simetrik grid olmayacak — yatay 2/3 + 1/3 veya 60/40 ayrımları, eğri uzunlukta sütunlar, tasarımı canlı tut.
5. **Sıcak nötrler.** Saf siyah-beyaz kullanma. Paper (#F0EFEF) hafif sıcak gri. Ink (#0B1323) hafif mavi-siyah. Ekran asla "Bootstrap" gibi soğuk hissetmesin.
6. **Tipografi karakterli.** TT Artnik'in karakterini öne çıkar: H1'ler büyük, negatif tracking ile, alt başlıklarda nefes payı. Caption'lar uppercase + letter-spacing ile editorial his.
7. **Mikro-animasyon, makro-sakinlik.** Sayfa geçişlerinde ağır animasyon yok. Hover'da 120ms `ease-out` opacity/transform, modal'da spring (motion). O kadar.
8. **Boş durum (empty state) ciddiye al.** "Henüz tool yok" ekranı sıkıcı bir tutorial değil — kısa, davetkar, eylem odaklı tek bir cümle + tek bir buton. Çok büyük illustrasyon yok, küçük geometrik ikon.
9. **Komuta odaklı.** `Cmd+K` ile global command palette her sayfadan açılır (Raycast tarzı). İçinde: tool ara, sayfa git, ayar değiştir, log filtrele.
10. **WordPress refleksleri YASAK:** Üst üste binmiş notification bar'ları, "Settings → General → Sub-tab → Sub-sub-tab" derinliği, gri-mavi-yeşil mosaic admin bar, screen options dropdown, "Howdy, admin!" tarzı tonlama — hiçbiri olmayacak. Tonlama net, ürün-grade, profesyonel ama sıcak.

### 3.6 Komponent karakteri
- **Button (primary):** Mist-300 bg, ink-900 text, hover'da mist-400. 8px radius, 40px height (sm: 32, lg: 48). Border yok, çok hafif inner shadow.
- **Button (secondary):** Transparent bg, 1px ink-200 border, ink-900 text. Hover'da paper-200 bg.
- **Button (ghost):** Hiçbir sınır yok, sadece hover'da paper-200 bg.
- **Input:** 1px ink-100 border, 8px radius, focus'ta mist-300 border + mist focus ring. İçten 12px padding, 14px font.
- **Card:** Surface bg, 1px border, 12px radius, 24px padding. Asla shadow ile yüzmez.
- **Sidebar item:** 8px radius, sol kenarda **4px mist çubuk** aktif olduğunda. Bu küçük detay paneli karakterli yapacak — sıradan "background highlight" değil.
- **Topbar:** Sticky, alt 1px border, sol breadcrumb + ortada command palette tetikleyici (Cmd+K göstergeli pill), sağda kullanıcı menüsü + tema toggle.
- **Tool card:** Yatay layout. Sol: 48x48 tool ikonu (rounded 8). Orta: tool adı (h3) + açıklama (body sm) + meta satırı (versiyon · tip · son kullanım). Sağ: "Aç" butonu + üç nokta menü. Hover'da border mist-200'e döner, hafif transform yok — sadece subtle border değişimi.
- **Empty state:** Ortalı, max 400px genişlikte. Küçük geometrik ikon (lucide), h2 başlık, body-lg açıklama, primer buton.

### 3.7 Logo kullanımı
- Light mode: koyu logo (ink-900 + mist halka)
- Dark mode: beyaz logo (paper + mist halka)
- Sidebar collapsed: sadece halka simgesi (32x32)
- Sidebar expanded: tam logo (height 28px)

---

## 4. EKRAN-EKRAN UX

### 4.1 Login (`/login`)
- Tek sayfa, ortalı. Sol 40% boş paper alan + büyük yarı şeffaf meaprojects simgesi (dekoratif, kısmen ekran dışında).
- Sağ 60% form: logo (üstte), display başlık "Tekrar hoş geldin.", email + parola input, primer "Giriş yap".
- "Tasarımcılar, yazarlar ve düşünenler için kendi AI atölyen." alt cümlesi.
- Hatada input border `--danger`, altında 13px hata metni.

### 4.2 Dashboard (`/dashboard`)
- Selamlama: "İyi günler, {isim}." (display-xl, tek satır).
- Altında 4'lü metrik şeridi: Kurulu Tool · Bu Hafta Çalıştırma · Token Kullanımı · Toplam Maliyet. Her biri ince border kart, içinde caption + büyük rakam + küçük 7 günlük spark çizgi (mist-300 stroke).
- Altında 2 kolonlu (60/40) bölüm:
  - Sol: "Son kullandıkların" — son 5 tool, tool-card stilinde.
  - Sağ: "Hızlı eylemler" — "Yeni tool yükle", "Dokümanı aç", "API key ekle". Her biri ikon + tek satır.
- En altta yatay timeline şerit: son 10 LLM çağrısı (kompakt log).

### 4.3 Tools listesi (`/tools`)
- Üstte page header: h1 "Tools" + sağda "Yeni tool yükle" primer buton.
- Arama input (Cmd+K hint), tip filtresi (chip: Tümü / Statik / SPA / Backend), sıralama dropdown.
- Liste: vertical stack, her satır tool-card.
- Empty state: "Henüz hiç tool yok. İlkini yükle ve tek panelden kullanmaya başla." + "Tool yükle" butonu.

### 4.4 Tool yükleme (`/tools/upload`)
- Tek geniş dropzone. Dashed 2px border (ink-200), 16px radius, 280px yükseklik. Tek satır metin: "Zip dosyanı buraya bırak ya da seç". Alt metin: "tool.json doğrulanır, izinleri onaylarsın, kurulur."
- Dosya seçildiğinde dropzone yerine 3 adımlı progress: 1) Zip çözülüyor 2) Manifest doğrulanıyor 3) Kuruluyor. Her adım check'lendiğinde mist çek.
- Manifest okunduktan sonra **izin onay ekranı** modal'da: "Bu tool şu izinleri istiyor: LLM (Anthropic), Lokal Storage. İzin ver / İptal."

### 4.5 Tool detayı (`/tools/[slug]`)
- Üstte: 64x64 ikon, isim (h1), versiyon badge, yazar, açıklama.
- Sağ üstte: primer "Çalıştır" buton, secondary üç nokta menü (devre dışı bırak, yeniden yükle, sil).
- Alt sekmeler: Genel · İzinler · Storage · Loglar.
- Genel: manifest detayları (tablo formatında), kurulum tarihi, son çalıştırma.
- İzinler: izinlerin listesi + iptal butonu.
- Storage: tool'un yazdığı key-value çiftleri (read-only tablo, search'lü).
- Loglar: bu tool'a ait son 50 çalıştırma + LLM çağrısı.

### 4.6 Tool çalıştırma (`/tools/[slug]/run`)
- Tam ekran. Üstte ince çubuk (40px): geri butonu, tool adı, "fullscreen" toggle, kapat (X).
- Altında iframe (sandboxed, ama `window.meaprojects` enjekte edilmiş). iframe sınırsız genişlikte, panel topbar/sidebar gizli (immersive mode).
- Fullscreen toggle ile ince çubuk da kaybolur, sadece floating mini-bar kalır sağ üstte.

### 4.7 Logs (`/logs`)
- Tablo: zaman · tool · tip (run/llm-call) · model · token (in/out) · maliyet · durum.
- Üstte filtre: tarih aralığı, tool, tip.
- Satıra tık → drawer açılır, payload + response (yumuşatılmış JSON viewer).

### 4.8 Settings
- Sol mini-nav: Hesap · API Keys · Görünüm · Gelişmiş.
- API Keys: Anthropic, OpenAI, Google. Her biri input + "test et" buton + son test tarihi. Key'ler maskeli (`sk-ant-•••••abcd`).
- Görünüm: tema (light/dark/system), dil (tr/en).
- Gelişmiş: tool storage temizle, log temizle, panel export, panel import.

### 4.9 Docs (`/docs`)
- Panel içi dokümantasyon. Sol nav (kategori bazlı), sağ içerik (markdown render).
- Bölümler: Başlarken, Manifest Referansı, `window.meaprojects` API'si, Tool Tipleri, Örnek Tool, Sık Hatalar.
- Code blok'lar mono font, ink-800 bg, paper text (dark style), copy butonu.

### 4.10 Command Palette (`Cmd+K`)
- Üstten 120px aşağıda açılır, max-width 560px, 16px radius, mist focus ring.
- Tek input + altında gruplu sonuçlar: Sayfalar · Tool'lar · Aksiyonlar · Ayarlar.
- Klavye nav, Enter ile git, Esc kapat.

---

## 5. GÜVENLİK VE SANDBOXING

1. Tool iframe'leri `sandbox="allow-scripts allow-forms"` (allow-same-origin **YOK**). 
2. `window.meaprojects` köprüsü `postMessage` ile çalışır, origin doğrulaması zorunlu.
3. API key'ler asla tool'a sızmaz; LLM çağrıları panel'in `/api/bridge/llm` endpoint'i üzerinden proxy'lenir, panel ekleyip atar.
4. Storage izolasyonu: her tool sadece kendi `toolId` altındaki kayıtlara erişebilir.
5. Permissions her LLM/storage çağrısında server-side kontrol edilir.
6. Zip içeriğinde path traversal koruması (`../` reddedilir).
7. Backend tool'lar `127.0.0.1` portuna bind, dışarı açılmaz; panel reverse-proxy'ler.
8. Settings içindeki API key'ler AES-256 ile şifrelenir (`SETTINGS_ENCRYPTION_KEY` env var).
9. Rate limit: `/api/bridge/llm` per-tool dakikada 30 çağrı (config'lenebilir).

---

## 6. GELİŞTİRME REHBERİ

### 6.1 İlk çalıştırma
```bash
cp .env.example .env
# .env içinde: DATABASE_URL, NEXTAUTH_SECRET, SETTINGS_ENCRYPTION_KEY, ADMIN_EMAIL, ADMIN_PASSWORD
npm install
npx prisma migrate dev
npm run seed     # ilk kullanıcıyı .env'den oluşturur
npm run dev
```

### 6.2 Kod kalite kuralları
- TypeScript strict, `any` yasak (gerekirse `unknown` + narrowing).
- Server Component default, Client sadece interaction varsa.
- API route'larında zod input validation zorunlu.
- Her async işin try/catch'i ve anlamlı error response'u var.
- i18n hazır altyapı (tr default, en hazır ama key'ler dolu olmayabilir).
- A11y: focus ring her zaman görünür, semantic HTML, aria-label butonlarda.
- Lighthouse hedef: Performance 95+, A11y 100, Best Practices 100.

### 6.3 Test edilecek kritik akışlar
1. Geçerli bir zip yükle → tool kurulsun.
2. Geçersiz manifest → anlamlı hata.
3. Aynı slug'la tekrar yükle → güncelleme akışı.
4. Tool çalıştır → iframe yüklensin, `window.meaprojects.llm.complete` çağrısı yap → cevap dönsün.
5. Tool sil → dosyalar ve DB kayıtları temizlensin.
6. Cmd+K → her sayfadan açılsın, tool arasın.
7. Tema toggle → tüm panel anında değişsin, flicker yok.

### 6.4 Vermeyi unutma
- `README.md` (kurulum + tool yazma rehberi).
- `examples/hello-tool/` klasörü — bir örnek tool zip'i nasıl hazırlanır gösteren bir referans (kullanıcı istemese de örnek klasör olarak repoda dursun, çalıştırılmasın).
- `.env.example`.
- `docs/manifest-spec.md` ve `docs/bridge-api.md`.

---

## 7. TESLİMAT

Tek seferde tüm projeyi üret. Eksik fonksiyon bırakma — sadece `backend tool subprocess management` kısmında net `TODO(v2):` yorumları bırak. Geri kalan her şey çalışır halde olsun. UI her ekranda gerçek veriyle (boş bile olsa empty state'ler oturmuş) görünsün.

Bittiğinde özet ver: hangi dosyalar oluşturuldu, hangi komutla çalıştırılır, hangi varsayımları yaptın.

---

## 8. SON HATIRLATMA — TONLAMA

meaprojects bir ofis aracı değil, bir atölye. Sahibinin kendi ürettiği şeyleri sergilediği bir vitrin. Dil ciddi ama soğuk değil — "Pano" yerine "Kontrol", "Eklentiler" yerine "Tool'lar", "İptal" yerine "Vazgeç". Türkçe öncelikli, terimleri yerelleştirmekten kaçınma ama zorlamadan: "log" log kalır, "tool" tool kalır. WordPress değiliz; yarı-teknik bir yaratıcının kendi atölyesiyiz.

Tasarımda her ekran üç soruya cevap vermeli: "Şu an neredeyim?", "Buradan ne yapabilirim?", "Bir sonraki adımım ne?". Bu üç soruya cevap veremeyen hiçbir ekranı teslim etme.

Başla.

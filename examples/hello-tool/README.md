# Hello Tool

meaprojects için minimal bir örnek tool. `window.meaprojects.llm.complete` (Anthropic) ve `window.meaprojects.storage` çağrılarını gösterir.

## Yükleme

1. Bu klasörü zip'le (içeride `tool.json` ve `index.html` olmalı).
2. Panel → **Tool'lar → Yeni tool yükle**.
3. İzin ekranında üç izni onayla: `llm:anthropic`, `storage:local`, `events:emit`.
4. **Ayarlar → API Anahtarları**'ndan Anthropic anahtarını ekle.
5. Tool'u aç ve bir soru sor.

## Yapısı

- `tool.json` — manifest. Detay için [`docs/manifest-spec.md`](../../docs/manifest-spec.md).
- `index.html` — saf HTML/CSS/JS. Bridge API'sini stil ya da framework olmadan kullanır.

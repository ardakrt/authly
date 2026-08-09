# TASK-0007: Logo paketini uygulama yüzeylerine bağla

## Durum

Tamamlandı — 2026-08-09

## Amaç

Workspace yanındaki `Authly-Transparent-Icon-Pack` klasöründeki şeffaf Authly logosunun
uygulama başlığı, Electron penceresi, sistem tepsisi, renderer favicon'u ve
Windows installer yüzeylerinde kullanıldığını doğrulamak.

## Kapsam

- Logo paketindeki PNG ve ICO kaynaklarını mevcut uygulama varlıklarıyla karşılaştırmak.
- Renderer, Electron pencere, tray ve electron-builder bağlantılarını doğrulamak.
- Üretim build'i ve gerçek Electron smoke testiyle varlıkların paketleme/yükleme akışını kontrol etmek.

## Kapsam dışı

- Logo tasarımını değiştirmek veya yeni görsel üretmek.
- Uygulama adı, renk sistemi ya da genel arayüz tasarımını değiştirmek.
- Commit, push, tag, release veya installer yayını.

## Etkilenen dosyalar

- `AGENTS.md`
- `docs/PROJECT_MAP.md`
- `docs/SECURITY_NOTES.md`
- `docs/HANDOFF.md`
- `docs/tasks/TASK-0007-logo-paketini-uygulama-yuzeylerine-bagla.md`

Logo binary dosyaları yeni paket kaynaklarıyla değiştirildi:

- `resources/icon.png`
- `resources/icon.ico`
- `resources/tray-icon.png`
- `src/renderer/src/assets/logo.png`
- `src/renderer/public/icon.png`
- `src/renderer/public/favicon.png`

Boyuta özel kaynaklar kullanıldı: header 64 px şeffaf kaynak, tray/favicon 32 px,
pencere/renderer ikonu 512 px ve Windows installer paketteki `.ico`. Header'da
paketin geniş transparan boşluğu 36 px yerleşim alanı içinde 56 px görsel ölçüsüyle
kırpılarak işaret belirginleştirildi. `tests/renderer/App.test.tsx` davranış testi korunuyor.

## Veri tabanı etkisi

Yok; şema, migration ve kullanıcı verisi değişmedi.

## Güvenlik etkisi

Yok; yalnızca statik PNG/ICO varlık bağlantıları doğrulandı. Main/renderer sınırı,
IPC sözleşmeleri, izinler ve hassas veri akışı değişmedi.

## Yetki/auth etkisi

Yok.

## Lokalizasyon etkisi

Yok.

## UX etkisi

Authly logosu uygulama başlığında, pencere/installer ikonunda, tray ikonunda ve
favicon'da tutarlı biçimde kullanılır.

## Log/audit etkisi

Yok; secret veya OTP loglanmadı.

## Kabul kriterleri

- `resources/icon.png`, `resources/icon.ico` ve renderer logo dosyaları verilen paketle hash düzeyinde eşleşir.
- `createMainWindow.ts`, `TrayService.ts`, `AppHeader.tsx`, `index.html` ve `package.json` doğru varlıkları referans eder.
- `npm run verify` başarılıdır.
- `ackit scan --ci` sonucu incelenir ve güvenlik kapıları zayıflatılmaz.
- `git diff --check` başarılıdır.

## Test adımları

- Şeffaf paket SHA-256 karşılaştırması: altı PNG/ICO hedefinin tamamı kaynakla birebir eşleşti; 512 px `F6FED4...D6317`, ICO `3F23DA...83D12`, 32 px `B9AB22...9AD5F`, 64 px header `5B9E86...1F6BE`.
- `npm test -- tests/renderer/App.test.tsx`: 1 dosya, 4/4 test geçti.
- `npm run smoke:visual`: `AUTHAPP_SMOKE_READY`; 768 px çıktı görsel olarak incelendi, şeffaf ve büyütülmüş header logosu doğrulandı.
- `npm run verify`: format, lint, 12 dosyada 31/31 test, strict typecheck, production build ve Electron smoke geçti.
- `ackit doctor`: exit 1; pre-existing LICENSE eksikliği, Node deposuna uygulanamayan NuGet tool metadata kontrolü ve gitignored `node_modules` bulguları. CriticalRedactRisk geçti.
- `ackit scan --ci`: exit 1; daha önce TASK-0002'de incelenmiş npm lockfile integrity/registry false-positive'ları ve yerel geliştirme logları. Yeni logo kodunda secret/OTP bulgusu yok; kapı zayıflatılmadı.
- `git diff --check`: exit 0.

## Riskler

- Çok küçük tray/favicon boyutunda ayrıntı kaybı olabilir; paket içindeki özel 16 px
  kaynak kullanılarak bu risk azaltılmıştır.
- Windows ikon önbelleği eski ikonu geçici olarak gösterebilir; yeni installer veya
  uygulama yeniden başlatmasıyla güncellenir.

## Geri alma planı

Geri alma gerekirse yalnızca bu task'ta değiştirilen altı binary varlık önceki
kaynaklarıyla değiştirilir. Destructive Git kullanılmaz.

## Tamamlama notları

Kullanıcının son seçimi olan `Authly-Transparent-Icon-Pack` uygulandı. Pencere,
installer, tray, favicon ve header aynı transparan marka ailesini kullanıyor.
Header görünürlüğü, transparan kaynaktaki geniş boşluk hesaba katılarak büyütüldü.

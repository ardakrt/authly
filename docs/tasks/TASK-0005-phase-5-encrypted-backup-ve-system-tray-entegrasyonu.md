# TASK-0005: Phase 5 Encrypted Backup ve System Tray Entegrasyonu

## Durum

Tamamlandı — 2026-08-09

## Amaç

Hesapların parola korumalı (PBKDF2 + AES-256-GCM) olarak şifreli dosyaya aktarılması ve geri yüklenmesi ile uygulamanın kapatıldığında sistem tepsisinde (System Tray) çalışmaya devam etmesi özelliklerini entegre etmek.

## Kapsam

- **Şifreli Yedekleme (Encrypted Backup):**
  - Node `crypto` ile PBKDF2 (100.000 iterasyon, SHA-256) anahtar türetme.
  - AES-256-GCM ile JSON payload şifreleme ve doğrulama etiketi (authTag) kontrolü.
  - `.authapp` uzantılı yedek dosyası üretme ve içeri aktarma (`BackupService`).
  - Hatalı parola durumunda fail-closed hata yönetimi.
- **Sistem Tepsisi (System Tray & Settings):**
  - Electron native `Tray` menüsü ("Authapp'i Göster", "Çıkış").
  - `closeToTray` ve `startMinimized` tercihlerini `SettingsRepository` üzerinde saklama.
  - Pencere kapatıldığında (`close` olayı) uygulamayı tepside gizleme ve tepsiye çift tıklayarak geri getirme.
- **IPC & Renderer UI:**
  - `backup:export`, `backup:import`, `settings:get`, `settings:update` Zod schemas ve IPC kanalları.
  - Ayarlar ekranında (SettingsPage) yedek dışa/içe aktarma formları ve sistem tepsisi tercih anahtarı.

## Kapsam dışı

- Bulut senkronizasyonu veya uzak sunucu bağlantısı (offline mimari korunur).
- Parolasız ham metin (plaintext) dışa aktarım.

## Etkilenen dosyalar

- `src/shared/schemas/backup.ts`
- `src/shared/schemas/settings.ts`
- `src/shared/ipc/channels.ts`
- `src/shared/types/electron-api.ts`
- `src/main/services/BackupService.ts`
- `src/main/services/SettingsService.ts`
- `src/main/window/TrayService.ts`
- `src/main/ipc/registerAppHandlers.ts`
- `src/main/index.ts`
- `src/preload/index.ts`
- `src/renderer/src/pages/SettingsPage.tsx`
- `tests/unit/backupService.test.ts`
- `tests/unit/settingsService.test.ts`
- `tests/setup.ts`

## Kabul kriterleri

- Dışa aktarılan yedek dosyasında plaintext secret bulunmaz; PBKDF2 + AES-256-GCM zarfı kullanılır.
- Yanlış parola girildiğinde yedek çözülmez ve anlaşılır bir hata döner.
- Kapatma butonuna basıldığında (closeToTray etkinse) uygulama kapanmaz, sistem tepsisine küçülür.
- Ayarlar ekranında tepsi davranışı açılıp kapatılabilir.
- Vitest unit testleri (28/28), ESLint, Prettier, strict TypeScript ve Electron smoke testi yeşil geçer.

## Test adımları ve Kanıtlar

- `npm test`: 11 test dosyasında 28/28 test başarıyla geçti.
- `npm run verify`: Prettier format check, ESLint max-warnings 0, Vitest testleri, TypeScript typecheck, production build ve Electron runtime smoke testi yeşil geçti.
- `ackit doctor`: PASS CriticalRedactRisk (Kritik sızıntı riski yok).
- `git diff --check`: Satır sonu / whitespace sorunu bulunmadı.

## Tamamlama notları

3 (Şifreli Yedekleme & Dışa/İçe Aktarma) ve 5 (Sistem Tepsisi Entegrasyonu) maddeleri mimari ve güvenlik ilkelerine uyularak tamamlandı.

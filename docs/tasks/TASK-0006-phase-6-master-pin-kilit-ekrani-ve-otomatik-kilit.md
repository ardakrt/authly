# TASK-0006: Phase 6 Master PIN Kilit Ekranı ve Otomatik Kilit

## Durum

Tamamlandı — 2026-08-09

## Amaç

Uygulama açılışında ve hassas veri erişimlerinde kodların üçüncü şahıslar tarafından görülmesini engellemek amacıyla PBKDF2 şifrelemeli Master PIN ve tam ekran kilit arayüzünü (LockScreenOverlay) entegre etmek.

## Kapsam

- **Master PIN Servisi ve Güvenlik Sınırı (`LockService`):**
  - Rakamlardan oluşan 4-12 haneli PIN'in PBKDF2 (100.000 iterasyon, SHA-256) ve rastgele 16-byte tuz (salt) ile türetilip `SettingsRepository`'de saklanması.
  - Sabit zamanlı karakter karşılaştırma (`timingSafeEqual`) ile PIN doğrulaması.
  - Uygulama kilitli durumdayken (`isLocked = true`) ana süreçteki (Main Process) tüm hassas IPC kanallarının (`listAccounts`, `createAccount`, `updateAccount`, `deleteAccount`, `getTotpCodes`, `exportBackup`, `importBackup`) otomatik engellenmesi (`assertNotLocked`).
- **Kilit Ekranı ve Arayüz (LockScreenOverlay & SettingsPage):**
  - Uygulama açılışında PIN ayarlıysa ekranı kaplayan cam tasarımı kilit katmanı (`LockScreenOverlay`).
  - Fiziksel klavye (0-9, Backspace, Enter) ve dokunmatik/fare tuş takımı desteği.
  - Hatalı PIN denemesinde görsel ve metinsel uyarı.
  - Ayarlar ekranında PIN oluşturma, değiştirme, kaldırma ve "Şimdi Kilitle" butonları.

## Kapsam dışı

- Windows Hello / parmak izi biyometrik entegrasyonu (sonraki geliştirmeler).

## Etkilenen dosyalar

- `src/shared/schemas/lock.ts`
- `src/shared/ipc/channels.ts`
- `src/shared/types/electron-api.ts`
- `src/main/services/LockService.ts`
- `src/main/ipc/registerAppHandlers.ts`
- `src/main/index.ts`
- `src/preload/index.ts`
- `src/renderer/src/components/LockScreenOverlay.tsx`
- `src/renderer/src/pages/SettingsPage.tsx`
- `src/renderer/src/app/App.tsx`
- `src/renderer/src/styles/app.css`
- `tests/unit/lockService.test.ts`
- `tests/setup.ts`

## Kabul kriterleri

- Master PIN belirlendiğinde uygulama kilitli açılır ve PIN girmeden hiçbir IPC kanalından kod veya hesap verisi alınamaz.
- Doğru PIN girildiğinde kilit ekranı kalkar ve uygulama normal çalışmasına devam eder.
- Vitest unit testleri (30/30), ESLint, Prettier, strict TypeScript ve Electron smoke testi yeşil geçer.

## Test adımları ve Kanıtlar

- `npm test`: 12 test dosyasında 30/30 test başarıyla geçti.
- `npm run verify`: Prettier format check, ESLint max-warnings 0, Vitest testleri, TypeScript typecheck, production build ve Electron runtime smoke testi yeşil geçti.
- `ackit doctor`: PASS CriticalRedactRisk (Kritik sızıntı riski yok).
- `git diff --check`: Satır sonu / whitespace sorunu bulunmadı.

## Tamamlama notları

TASK-0006 kapsamındaki Master PIN ve kilit ekranı mimarisi, main process güvenlik sınırları korunarak başarıyla tamamlandı.

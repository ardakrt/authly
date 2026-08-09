# Proje Haritası

## Çalışan Phase 1 yapısı

```text
src/
  main/
    index.ts                 Electron lifecycle ve yerel protocol
    ipc/                     Runtime-validated IPC handlers
    security/                CSP, trusted sender, asset containment
    window/                  Hardened BrowserWindow
  preload/
    index.ts                 Dar contextBridge API
  renderer/
    index.html
    src/
      app/                   App shell ve tema
      components/            Header, dialog, page heading
      hooks/                 Klavye ve tema hooks
      pages/                 Home, add placeholder, settings
      styles/                Uygulama stilleri
  shared/
    ipc/                     Kanal sabitleri
    schemas/                 Zod contract’ları
    types/                   Main/renderer ortak tipleri
resources/
  icon.ico                   Windows installer ve uygulama ikonu
  icon.png                   Electron pencere ikonu
  tray-icon.png              Windows sistem tepsisi ikonu
tests/
  unit/                      Güvenlik/path/schema testleri
  renderer/                  UI, rota ve shortcut testleri
scripts/
  smoke.mjs                  Gerçek Electron startup kontrolü
```

Renderer marka görselleri `src/renderer/src/assets/logo.png` üzerinden uygulama
başlığında, `src/renderer/public/favicon.png` üzerinden renderer favicon'unda
kullanılır. Güncel `Authly-Transparent-Icon-Pack` dağılımı header için 64 px
şeffaf kaynak, tray/favicon için 32 px, pencere/renderer ikonu için 512 px ve
installer için `.ico` kaynağıdır.

## Servis sınırları

- `AccountService` → account use-case orchestration ve main-process secret erişimi (hazır)
- `VaultService` → OS encryption abstraction (hazır)
- `TotpService` → RFC 6238, Base32 ve otpauth parsing
- `ScreenQrService` → screen capture + QR decode
- `BackupService` → KDF + authenticated encrypted export/import
- `AccountRepository`, `GroupRepository`, `SettingsRepository` → tek SQLite data-access sınırı (hazır)

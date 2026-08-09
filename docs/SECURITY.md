# Güvenlik Modeli

## Tehdit varsayımları

- Renderer’da XSS oluşabileceği varsayılır; XSS’in OS/Node yetkisine yükselmesi engellenir.
- Yerel Windows kullanıcısının oturumu açıksa DPAPI tek başına uygulama kilidi değildir.
- Memory scraping ve tamamen ele geçirilmiş OS, MVP’nin koruyabileceği sınırın dışındadır.

## Phase 1 kontrolleri

- `contextIsolation: true`
- `nodeIntegration: false`
- `sandbox: true`
- `webSecurity: true`
- Production’da secure/standard `authapp://` protocol
- `script-src 'self'`, production `connect-src 'none'` CSP
- Tüm permission request/check çağrılarını reddetme
- Yeni pencere açılmasını reddetme
- Beklenmeyen navigation’ı reddetme
- IPC sender origin ve Zod request/response validation
- Preload’da ham `ipcRenderer` yerine tek metotlu frozen API

## SQLite ve DPAPI yaklaşımı

- SQLite erişimi `LocalDatabase` ve repository katmanında yapılır.
- `encryptedSecret` binary/base64 encoded encrypted blob olarak saklanır; plaintext kolon yoktur.
- `VaultService` arayüzünün Windows implementasyonu async Electron `safeStorage` kullanır.
- `safeStorage.isEncryptionAvailable()` false ise kayıt işlemi durur; plaintext fallback yoktur.
- Database ve backup encryption farklı anahtar/format/servis sınırlarıdır.

## Backup yaklaşımı (Phase 7)

- Kullanıcı parolasından Argon2id ile anahtar türetme.
- Rastgele salt ve nonce.
- AES-256-GCM authenticated encryption.
- Sürüm, KDF parametreleri ve cipher metadata’sı içeren doğrulanabilir container.
- Import’ta decrypt → schema validate → preview → explicit confirm → transaction.

## Loglama

Secret, OTP, backup parolası, decrypted payload, QR içeriği ve raw IPC payload loglanmaz. Public renderer hataları teknik stack, machine path veya hassas ayrıntı içermez.

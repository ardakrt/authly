# TASK-0003: Phase 2 şifreli SQLite veri katmanı

## Durum

Tamamlandı

## Amaç

SQLite migrations ve repository katmanını kurmak; TOTP secret değerlerini Electron `safeStorage`/Windows DPAPI ile main process içinde şifreleyerek CRUD akışını tamamlamak.

## Kapsam

- `better-sqlite3`, uygulama data path’i ve connection lifecycle.
- Numaralı, transaction kontrollü migration runner.
- Account, Group ve Settings repository sınırları.
- Platform-bağımsız `VaultService` arayüzü ve `ElectronSafeStorageVault` implementasyonu.
- Secret içermeyen account DTO’ları ve Zod-validated CRUD IPC.
- Encrypted-at-rest ve rollback/integrity testleri.

## Kapsam dışı

- TOTP üretimi/sayaç/pano (Phase 3).
- QR ve screen capture (Phase 4–5).
- Cloud backend, kullanıcı hesabı veya plaintext fallback.

## Etki değerlendirmesi

- Veri tabanı: İlk SQLite şeması ve forward migration sistemi.
- Güvenlik: Secret renderer’a dönmez; `safeStorage.isEncryptionAvailable()` false ise write fail-closed.
- Yetki: Yeni OS permission istemi yok.
- Uyumluluk: Native SQLite modülü Electron ABI için rebuild/package doğrulaması gerektirir.
- Deployment: Migration idempotency ve packaged app data path testi gerekir.

## Kabul kriterleri

- SQLite’da plaintext secret bulunmaz.
- CRUD ve sıralama transaction’ları repository dışında SQL çalıştırmaz.
- Secret yalnızca main process VaultService içinde encrypt/decrypt edilir.
- Renderer DTO ve error’ları hassas ayrıntı içermez.
- Focused repository/vault/IPC testleri ve `npm run verify` geçer.

## Riskler

- Native module ABI uyumsuzluğu; Electron rebuild/package smoke ile doğrulanacak.
- DPAPI kullanılabilir değilse veri kaybına yol açan fallback; fail-closed uygulanacak.
- Migration yarıda kalması; transaction ve schema version kontrolü uygulanacak.

## Geri alma planı

Development veritabanı fixture’ları yeniden üretilebilir. Gerçek kullanıcı verisi için destructive rollback uygulanmayacak; forward compensating migration planı yazılacak.

## Tamamlama notları

Tamamlanan katman: `better-sqlite3`, transaction migration, accounts/groups/settings şeması, üç repository, async DPAPI-backed VaultService, secret içermeyen CRUD IPC ve preload API. Secret yalnızca main-process `AccountService.getTotpSecret` sınırından çözülür; renderer sözleşmesine girmez. Secure-storage unavailable durumunda write fail-closed.

Kanıt: `npm run verify` başarılı; 6 test dosyası ve 14/14 test; Electron native rebuild + runtime smoke başarılı. Smoke gerçek `safeStorage` encrypt/decrypt işlemini de doğrular. Gerçek hesap ekleme UI’si Phase 4 kapsamındadır.

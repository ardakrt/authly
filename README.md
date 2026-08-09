# Authapp

Windows öncelikli, tamamen offline çalışan masaüstü authenticator projesi. Hedef; Google Authenticator ile uyumlu TOTP hesaplarını güvenli bir Electron main-process sınırı arkasında yönetmek.

> Güncel durum: Çalışan MVP hazır. Manuel secret veya `otpauth://` URI ile hesap eklenebilir; RFC 6238 kodları çevrimdışı üretilir ve secret'lar Windows şifreleme API'siyle yerelde korunur.

## Gereksinimler

- Windows 10/11
- Node.js 20.19+ (önerilen: Node.js 22 LTS)
- npm 11+

## Geliştirme

```powershell
npm ci
npm run dev
```

## Doğrulama

```powershell
npm run verify
```

Bu komut sırasıyla format, lint, Vitest, strict TypeScript, production build ve gerçek Electron runtime smoke kontrolünü çalıştırır.

Tek tek kontroller:

```powershell
npm run typecheck
npm run lint
npm test
npm run build
npm run smoke
```

## Windows installer

Installer yapılandırması hazırdır; nihai güvenlik incelemesi Phase 8’de yapılacaktır.

```powershell
npm run package:win
```

Çıktılar `dist/` altında oluşur. İmzalama bu MVP aşamasında yapılandırılmamıştır; imzasız installer Windows SmartScreen uyarısı gösterebilir.

## Güvenlik sınırı

Renderer; Node.js, dosya sistemi, veritabanı veya encryption API’sine doğrudan erişemez. Preload yalnızca isimlendirilmiş, runtime-validated çağrıları açar. Production renderer `authapp://app` güvenli yerel protokolünden yüklenir.

Detaylar:

- [Mimari](docs/ARCHITECTURE.md)
- [Güvenlik modeli](docs/SECURITY.md)
- [Phase 1 özeti](docs/phases/PHASE-1.md)
- [Tamamlanan MVP görevi](docs/tasks/TASK-0004-calısan-authenticator-mvp-sini-tamamla.md)

## Yol haritası

1. Güvenli Electron/React temeli
2. SQLite, migrations, repositories ve DPAPI-backed VaultService
3. RFC 6238 TOTP, sayaç ve güvenli pano akışı
4. Manuel/URI/QR görselinden hesap ekleme
5. Ekrandan QR tarama
6. Arama, favoriler, gruplar, reorder ve ayarlar
7. Argon2id + AES-256-GCM şifreli backup
8. Güvenlik incelemesi, UI/performance polish ve Windows installer

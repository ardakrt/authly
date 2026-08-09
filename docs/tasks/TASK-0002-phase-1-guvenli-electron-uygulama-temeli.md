# TASK-0002: Phase 1 güvenli Electron uygulama temeli

## Durum

Tamamlandı — 2026-08-09

## Amaç

Windows öncelikli, tamamen offline authenticator uygulaması için Electron main, sandboxed preload ve React renderer sınırlarını kurmak; sonraki fazların güvenli biçimde eklenebileceği çalışan bir Phase 1 teslim etmek.

## Doğrulanmış mevcut durum

- Depo başlangıçta boş ve `master` dalında henüz commit yoktu.
- Remote tanımlı değil.
- ACKit 1.0.0-rc.1 kurulu; ilk scan risk bulmadı, doctor beklenen başlangıç dosyalarının eksikliğini bildirdi.
- Uygulama kodu, package manager kilidi ve var olan kullanıcı değişikliği yoktu.

## Kapsam

- Electron + React + TypeScript strict + Vite/electron-vite kurulumu.
- Main/preload/renderer/shared ayrımı ve type-safe dar IPC örneği.
- Electron güvenlik varsayılanları, CSP, sender/navigation/window/permission engelleri.
- Ana ekran, ayarlar ve sonraki faz olarak açıkça etiketlenmiş hesap ekleme rotası.
- Dark/light/system tema, responsive pencere, empty/loading durumları ve temel klavye kısayolları.
- ESLint, Prettier, Vitest, build ve Windows installer yapılandırması.
- Mimari, güvenlik, geliştirme ve Phase 1 belgeleri.

## Kapsam dışı

- SQLite, migrations, repository implementasyonu ve secret saklama (Phase 2).
- TOTP kodu üretimi ve OTP kopyalama (Phase 3).
- Hesap kaydetme, QR, ekran tarama, gruplar, reorder ve backup (Phase 4–7).
- Windows Hello/PIN mock'u; güvenli gerçek uygulama olmadan güvenlik iddiası yok.
- Commit, push, tag, release veya installer yayınlama.

## Etkilenen dosyalar

- Kök build/lint/test/package yapılandırmaları.
- `src/main`, `src/preload`, `src/renderer`, `src/shared`.
- `tests`, `docs`, agent talimatları ve handoff.

## Etki değerlendirmesi

- Veri tabanı: Yok; SQLite Phase 2'de eklenecek.
- Public contract: `window.authapp.getRuntimeInfo()` dar preload API'si ilk sözleşmedir.
- Güvenlik: Main process güvenlik sınırı, sandbox ve runtime IPC validation kurulacak.
- Yetki/permission: Tüm renderer permission istekleri reddedilecek; ekran yakalama henüz yok.
- Uyumluluk: Windows 10/11 x64 öncelikli; Node.js >= 20.19 geliştirme gereksinimi.
- Lokalizasyon: MVP metinleri Türkçe; i18n altyapısı bu fazda yok.
- Deployment: Yok; builder config yalnızca ileride yerel installer üretimi için.
- Log/audit: Secret/OTP henüz yok; gelecekteki hassas veri yasağı SECURITY belgelerine yazılacak.

## Uygulama planı

1. Yapılandırma ve belgeleri oluştur.
2. Güvenli main + custom local protocol + dar IPC kur.
3. Preload contract ve React app shell/rotaları kur.
4. Focused testler ile statik kalite kapılarını çalıştır.
5. Gerçek Electron açılışını ayrı doğrula ve kanıtı kaydet.

## Kabul kriterleri

- BrowserWindow `contextIsolation: true`, `nodeIntegration: false`, `sandbox: true`, `webSecurity: true` ile açılır.
- Renderer ham Electron/Node/FS/DB/crypto API'sine erişemez.
- CSP, navigation, new-window ve permission engelleri kaynakta ve testlerde doğrulanır.
- IPC payload ve return değeri Zod ile runtime validate edilir.
- `/`, `/add`, `/settings` rotaları ve Ctrl+N, Ctrl+F, Ctrl+, kısayolları çalışır.
- UI sahte hesap, secret veya OTP göstermez; gerçek empty state kullanır.
- `npm run typecheck`, `npm run lint`, `npm run format:check`, `npm test`, `npm run build` başarılıdır.
- Electron uygulaması en az bir kez açılıp renderer yükleme hatası olmadığı doğrulanır.

## Riskler ve hata yönetimi

- Electron/Vite sürüm uyumsuzluğu: birbiriyle uyumlu Vite 7 + electron-vite 5 sabitlenir ve build ile doğrulanır.
- CSP geliştirme HMR'yi engelleyebilir: development ve production CSP ayrı tutulur, script-src gevşetilmez.
- Custom protocol path traversal: normalize + root containment kontrolü ve birim testi.
- Yanlış güvenlik algısı: Phase 1'in secret saklamadığı UI ve belgelerde açık yazılır.

## Geri alma planı

Henüz commit olmadığı için otomatik destructive Git komutu kullanılmayacak. Geri alma gerekirse yalnızca bu task'ta eklenen dosyalar kullanıcı onayıyla kaldırılır.

## Test adımları

Çalıştırılan:

- `npm install`: 522 package, audit 0 vulnerability.
- `npm test`: 4 dosya, 10/10 test geçti.
- `npm run verify`: format, lint, test, strict typecheck, production build ve Electron smoke geçti.
- `npm run smoke:visual`: 320/375/414/768 px production capture üretildi ve görsel olarak incelendi.
- OKLCH → WCAG hesaplaması: body/muted çiftleri en az 5.47:1; focus ring page yüzeyinde en az 3.70:1; accent text light token düzeltildi.
- `ackit config-check`: exit 0, tanı yok.
- `ackit scan`: exit 0; Critical 0. `scan --ci` exit 1 üreten 829 bulgunun tamamı npm tarafından üretilen `package-lock.json` ile sınırlı: 597 `integrity` hash’i, registry/resolved metadata’sı, bağımlılık maintainer adresi `i@izs.me` ve npm domain’i. Gerçek secret/signing key değil; suppression/allowlist eklenmedi.
- `ackit doctor`: exit 1; LICENSE seçimi maintainer’a bırakıldı, NuGetToolMetadata bu Node deposunda uygulanamaz, `node_modules` yerel ve gitignored build artifact.
- `npm audit --omit=dev`: 0 vulnerability.
- `git diff --check`: exit 0.

## Tamamlama notları

Phase 1 kabul kriterleri karşılandı. Gerçek runtime kontrolü ilk denemede siyah ekranı yakaladı: sandboxed preload, `zod`u external `require()` olarak bıraktığı için bridge kurulamıyordu. `preload.build.externalizeDeps: false` ile Zod bundle içine alındı ve smoke kapısı `.app-shell` DOM oluşumunu zorunlu kılacak şekilde güçlendirildi.

Database/migration yok; security/permission/deployment etkileri belgelenen Phase 1 sınırında. ACKit lockfile bulguları incelendi ve false positive olarak kaydedildi; CI kapısı suppression yetkisi olmadan değiştirilmedi. Commit, remote, CI run, installer, deployment ve release yapılmadı. Sonraki görev: TASK-0003.

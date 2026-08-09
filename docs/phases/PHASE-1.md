# Phase 1 — Güvenli uygulama temeli

## Yapılanlar

- Electron + React + TypeScript strict + Vite/electron-vite kuruldu.
- Main, sandboxed preload, renderer ve shared contract ayrıldı.
- Custom local protocol, CSP, sender/navigation/window/permission korumaları eklendi.
- Home, hesap ekleme planı ve ayarlar rotaları oluşturuldu.
- Light/dark/system tema, responsive pencere, loading/error/empty states eklendi.
- Ctrl+N, Ctrl+F, Ctrl+, ve native dialog Esc davranışı eklendi.
- ESLint, Prettier, Vitest, CI, production build ve Electron smoke kapıları eklendi.

## Önemli dosyalar

- `src/main/index.ts`
- `src/main/window/createMainWindow.ts`
- `src/main/security/*`
- `src/preload/index.ts`
- `src/renderer/src/app/App.tsx`
- `src/renderer/src/styles/app.css`
- `tokens.css`
- `tests/*`

## Bilinen eksikler

- Hesap CRUD, SQLite ve DPAPI yok (Phase 2).
- TOTP üretimi ve pano akışı yok (Phase 3).
- Hesap ekleme yöntemleri yalnızca plan durumunu gösterir; input yok (Phase 4–5).
- Installer imzası ve final packaging incelemesi yok (Phase 8).

## Doğrulama

- `npm run verify`: başarılı.
- Vitest: 4 test dosyası, 10 test, tamamı başarılı.
- Electron runtime: `AUTHAPP_SMOKE_READY`.
- Production visual smoke: 320, 375, 414 ve 768 px; yatay taşma veya siyah ekran yok.
- Hallmark pre-emit: P5 H5 E5 S5 R5 V4; 58/58 slop gate açık bulgu yok.

## Sonraki phase

Phase 2; numaralı migrations, `better-sqlite3`, repository katmanı, `VaultService` ve encrypted secret CRUD ekleyecek. Renderer’a secret geri döndürülmeyecek.

# Mimari

## Process sınırları

```text
React Renderer
  ↓ isimlendirilmiş AuthappApi
Sandboxed Preload / contextBridge
  ↓ ipcRenderer.invoke (allowlist)
Main IPC handlers
  ↓ sender + Zod validation
Application services
  ↓
Vault / TOTP / QR / Backup services
  ↓
Repositories → SQLite
```

Renderer yalnızca güvenli hesap metadata’sı, kullanıcıya gösterilecek TOTP kodu ve kalan süre gibi minimum sonuçları alır. Secret; React state, renderer storage veya renderer loglarına gönderilmez.

## Veri akışı — hesap kaydetme (Phase 2–4)

1. Renderer kullanıcı onaylı ekleme payload’ını IPC ile gönderir.
2. Main handler sender ve payload’ı doğrular.
3. `AccountService`, secret’ı `VaultService.encryptSecret` ile şifreler.
4. Repository yalnızca encrypted blob ve güvenli metadata’yı transaction içinde yazar.
5. Renderer’a secret içermeyen account DTO döner.

## Veri akışı — TOTP üretimi (Phase 3)

1. Renderer account ID listesiyle güncel kodları ister.
2. Main account kaydını repository’den okur.
3. Vault secret’ı main process içinde çözer.
4. TotpService kodu ve kalan süreyi üretir.
5. Geçici secret referansı bırakılır; OTP loglanmaz.

## Versiyonlanabilir sınırlar

- IPC contract’ları `src/shared/schemas` içinde tek kaynak olarak tutulur.
- Kripto, TOTP, QR ve storage kütüphaneleri service arayüzleri arkasında kalır.
- SQL migration’ları numaralı, forward-only ve transaction kontrollü olacaktır.
- Windows Hello/PIN için ileride `AppLockProvider` eklenecek; Phase 1’de mock yoktur.

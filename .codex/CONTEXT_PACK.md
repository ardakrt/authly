# Context Pack

Authapp; Windows öncelikli offline Electron/React/TypeScript authenticator projesidir. Main process güvenlik sınırıdır; renderer’a Node/FS/DB/crypto/ham IPC açılmaz, secret veya OTP loglanmaz.

Phase 1 TASK-0002 tamamlandı. `npm run verify` geçiyor; gerçek Electron smoke `.app-shell` DOM oluşumunu doğruluyor. Production preload Zod’u bundle eder (`externalizeDeps: false`) çünkü sandboxed preload harici npm `require()` çalıştıramaz.

Sonraki görev: `docs/tasks/TASK-0003-phase-2-sifreli-sqlite-veri-katmanı.md`.

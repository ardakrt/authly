# Claude Yönergeleri

Bu depo Windows öncelikli offline Electron/React/TypeScript authenticator projesidir.

- Önce `AGENTS.md`, aktif task, Git durumu ve ACKit preflight çıktısını incele.
- Kullanıcı değişikliklerini koru; task-first ve docs-first ilerle.
- Electron main process güvenlik sınırıdır. Renderer’a Node/FS/DB/crypto/ham IPC açma.
- Secret ve OTP loglama; plaintext storage veya güvensiz fallback ekleme.
- Focused testlerden sonra `npm run verify`, `ackit scan --ci` ve `git diff --check` çalıştır.
- Commit/push/release/deployment yalnızca açık yetkiyle yapılır.

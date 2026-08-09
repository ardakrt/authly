# Agent Yönergeleri

## Proje

Authapp — Windows öncelikli offline Electron/React/TypeScript authenticator.

## Zorunlu workflow

- Değişiklikten önce Git durumu, aktif task ve ilgili belgeleri okuyun.
- `ackit scan` ve `ackit doctor` bulgularını rapor olarak inceleyin; güvenlik kapılarını zayıflatmayın.
- Kullanıcı değişikliklerini koruyun; destructive Git kullanmayın.
- Main process’i güvenlik sınırı tutun. Renderer’a Node, filesystem, database, encryption veya ham IPC açmayın.
- Secret ve OTP değerlerini hiçbir process’te loglamayın.
- IPC input/output contract’larını shared Zod schemas ile runtime validate edin.
- Focused testten sonra `npm run verify`, `ackit scan --ci` ve `git diff --check` çalıştırın.
- Task, proje haritası, güvenlik notu ve handoff kanıtlarını davranışla birlikte güncelleyin.

## Yetki sınırı

Commit, push, tag, release, deployment, secrets/permissions değişikliği ve installer yayını açık kullanıcı yetkisi gerektirir.

## Aktif task

`docs/tasks/TASK-0007-logo-paketini-uygulama-yuzeylerine-bagla.md`

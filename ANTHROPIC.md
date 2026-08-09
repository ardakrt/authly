# Anthropic Agent Yönergeleri

`AGENTS.md` ve aktif task bu deponun çalışma sözleşmesidir. Git/ACKit preflight yap, mevcut çalışmayı koru, main/preload/renderer sınırını zayıflatma, secret veya OTP loglama ve her davranış değişikliğini test et. Tamamlamadan önce `npm run verify`, `ackit scan --ci` ve `git diff --check` çalıştır. Hosted veya destructive işlemler açık yetki gerektirir.

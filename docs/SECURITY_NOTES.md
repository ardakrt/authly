# Güvenlik Notları

Kalıcı güvenlik modeli için [SECURITY.md](SECURITY.md) dosyasını kullanın.

## Güncel durum

- Phase 1 renderer sandbox ve IPC sınırı kurulu.
- Secret storage ve TOTP henüz uygulanmadı; uygulama güvenli authenticator olarak kullanılmamalı.
- Bilinen production açığı yok; kapsam henüz işlevsel secret/OTP akışını içermiyor.
- Güncel şeffaf Authly logo paketi yalnızca statik PNG/ICO varlıklarından oluşur; renderer yetkileri,
  IPC sözleşmeleri, veri erişimi ve secret/OTP güvenlik sınırlarında değişiklik yoktur.

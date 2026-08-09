# Security Policy

## Hassas veri kuralları

- TOTP secret ve OTP değerleri loglanmaz.
- Secret; renderer storage, JSON veya plaintext SQLite alanında tutulmaz.
- Hassas işlemler Electron main process ve `VaultService` sınırında kalır.
- Güvenli OS encryption kullanılamıyorsa plaintext fallback yapılmaz.

## Güvenlik bildirimi

Bir güvenlik açığı bulursanız public issue içinde secret, OTP, kişisel veri veya exploit ayrıntısı paylaşmayın. Depo sahibine özel bir kanal üzerinden; etkilenen sürümü, yeniden üretim adımlarını ve olası etkiyi iletin.

## Destek durumu

Proje MVP geliştirme aşamasındadır. Phase 1 hesap veya secret saklamaz. Güvenlik açısından kullanılabilir authenticator iddiası Phase 2–3 tamamlanmadan yapılmaz.

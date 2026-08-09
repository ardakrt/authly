# TASK-0004: Çalışan authenticator MVP'sini tamamla

## Durum

Tamamlandı

## Amac

Güvenli veri katmanını gerçek bir authenticator olarak kullanılabilen en küçük tamamlanmış ürüne dönüştürmek.

## Kapsam

RFC 6238 TOTP, otpauth URI, manuel hesap ekleme, sayaç, kopyalama, pano temizleme ve silme onayı.

## Kapsam disi

QR/screen capture, backup, drag-drop ve Windows Hello sonraki sürüm geliştirmeleridir.

## Etkilenen dosyalar

## Veri tabani etkisi

## Guvenlik etkisi

Secret yalnızca main process içinde çözülür. OTP loglanmaz; pano 15 saniye sonra yalnızca değer değişmemişse temizlenir.

## Yetki/auth etkisi

## Lokalizasyon etkisi

## UX etkisi

## Log/audit etkisi

## Kabul kriterleri

- Manuel ve URI ile hesap eklenir.
- RFC 6238 SHA1/SHA256/SHA512 test vektörleri geçer.
- Kod, sayaç, kopyalama ve onaylı silme çalışır.
- Installer üretilir.

## Test adimlari

`npm run verify`, `npm run package:win`, ACKit final gates.

## Riskler

Installer imzasızdır ve SmartScreen uyarısı gösterebilir. Gelişmiş QR/backup özellikleri MVP dışında bırakılmıştır.

## Geri alma plani

Yeni TOTP/IPC/UI dosyaları geri alınabilir; mevcut SQLite şeması değişmedi.

## Tamamlama notlari

Uygulama çekirdek authenticator MVP olarak tamamlandı. 7 test dosyasında 18/18 test, production build, Electron smoke ve Windows NSIS installer üretimi geçti.

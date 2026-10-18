<p align="center"><a href="README.tr.md" lang="tr">Türkçe</a> · <strong>English</strong></p>

<p align="center">
  <img src=".github/readme/images/cover.png" alt="Authly — desktop verification codes and PIN lock" width="100%">
</p>

<div align="center">
  <h1>Authly</h1>
  <p><strong>Your codes. Your device.</strong></p>
  <p>An offline desktop authenticator for Windows and Linux.<br>Generate verification codes locally, without a cloud account.</p>
  <p><code>Windows</code> &nbsp; <code>Linux</code> &nbsp; <code>TOTP</code> &nbsp; <code>MIT</code></p>
  <p>
    <a href="https://github.com/ardakrt/authly/releases/latest">Download</a> ·
    <a href="#a-closer-look">Screenshots</a> ·
    <a href="#built-for-everyday-sign-ins">Features</a> ·
    <a href=".github/readme/DEVELOPMENT.md">Build from source</a>
  </p>
</div>

---

## Keep your sign-ins close

Authly brings your time-based verification codes into one desktop app. Add an account, find its code, and copy it when you need it. TOTP generation runs on your device; account secrets are stored locally using the operating system's encryption facilities.

1. **Add your account.** Enter a secret, paste an `otpauth://` URI, or import a QR image.
2. **Get your code.** See the current code and its countdown, then copy it in one click.
3. **Keep a recovery copy.** Export a password-encrypted backup before you need to move devices.

## A closer look

### Clear codes. Light or dark.

A focused account grid, a live countdown, and a compact navigation bar. Switch between dark, light, and system appearance; use the interface in English or Turkish.

<picture>
  <source media="(prefers-color-scheme: dark)" srcset=".github/readme/images/accounts-dark.png">
  <source media="(prefers-color-scheme: light)" srcset=".github/readme/images/accounts-light.png">
  <img src=".github/readme/images/accounts-dark.png" alt="Authly account grid with example verification codes and countdown bars" width="100%">
</picture>

<p align="center"><sub><a href=".github/readme/images/accounts-dark.png">Dark appearance</a> · <a href=".github/readme/images/accounts-light.png">Light appearance</a></sub></p>

### Add an account. Lock your workspace.

Manual entry, authenticator links, and QR image import share the same account workflow. A master PIN adds an application access lock.

<p align="center">
  <a href=".github/readme/images/add-account.png"><img src=".github/readme/images/add-account.png" alt="Authly account setup with manual entry and QR import" width="49%"></a>
  <a href=".github/readme/images/pin-lock.png"><img src=".github/readme/images/pin-lock.png" alt="Authly PIN lock screen" width="49%"></a>
</p>

<sub>These captures use the current renderer with synthetic accounts and fixed example codes. They contain no real secrets or usable authentication codes and are not a security audit.</sub>

## Built for everyday sign-ins

- **Offline TOTP.** RFC 6238 code generation with configurable algorithm, digit count, and period.
- **Several ways to add accounts.** Secret entry, `otpauth://` parsing, and QR image decoding.
- **Find and copy.** Account search, editable account details, and one-click code copying. The copied code is cleared after 15 seconds if it is still the clipboard's current content.
- **Local secret storage.** Electron `safeStorage` uses Windows DPAPI or an available Linux keyring backend to encrypt account secrets.
- **PIN access lock.** Protect the application interface with a master PIN and delayed retries after repeated failed attempts.
- **Encrypted backups.** Password-protected export and import using PBKDF2-SHA256 and AES-256-GCM.
- **Desktop controls.** System-tray behavior, English/Turkish language settings, and light/dark/system appearance.
- **Release updates.** Check GitHub releases and download available updates from inside the installed application.

## Make it yours

Appearance, language, tray behavior, encrypted backups, and update controls live in one settings view.

<p align="center">
  <a href=".github/readme/images/settings.png"><img src=".github/readme/images/settings.png" alt="Authly settings for theme, language, tray behavior, encrypted backups, and updates" width="100%"></a>
</p>

## Install

**[Get the latest release →](https://github.com/ardakrt/authly/releases/latest)**

Download the Windows installer from the release assets. Linux AppImage and Debian build targets are included in the repository; check the release assets for published packages, or follow the [build instructions](.github/readme/DEVELOPMENT.md#packaging).

- **Windows:** Windows 10/11, x64.
- **Linux:** x64 distribution with an installed, unlocked GNOME Keyring or KWallet service.

On Linux, Authly refuses to store new secrets if Electron selects its insecure `basic_text` fallback. An available, unlocked OS keyring is required.

## Local by design

Account data and encrypted secrets live in Electron's per-user application-data directory. A cloud account is not required for code generation or account management. Portable recovery uses a separate password-encrypted backup file.

<details>
<summary><strong>Storage, encryption, and network behavior</strong></summary>

- **Storage:** SQLite and OS-encrypted secrets are stored under `%APPDATA%\authapp` on Windows and typically `~/.config/authapp` on Linux. Runtime databases and personal backups do not belong in Git.
- **Backups:** The current export format derives a 256-bit key with PBKDF2-SHA256 and 600,000 iterations, then encrypts the backup with AES-256-GCM. Keep the backup password separately from the backup file.
- **PIN boundary:** The PIN gates application access. OS-backed encryption protects stored account secrets; the PIN is not presented as an independent encryption key for the entire vault.
- **Process boundary:** The renderer accesses account operations through named, validated IPC methods rather than direct Node.js or database access.
- **Network:** TOTP generation is offline. Update checks and downloads contact GitHub. The current renderer stylesheet also references Google Fonts; local font packages and system fallbacks are included. Offline operation does not mean every UI or update path makes zero network requests.

These are implementation details, not a claim of independent security certification.

</details>

## Develop

**Electron · React · TypeScript · Vite · SQLite**

With Node.js 20.19+ and npm 11+ installed:

```bash
git clone https://github.com/ardakrt/authly.git
cd authly
npm ci
npm run dev
```

Run the project's verification pipeline:

```bash
npm run verify
```

This runs formatting, lint, tests, strict TypeScript/build checks, and an Electron runtime smoke check. **[Development and packaging guide →](.github/readme/DEVELOPMENT.md)**

## License

[MIT](LICENSE). See the license file for attribution and terms.

---

<p align="center">
  <img src="resources/icon.png" alt="" width="36" height="36"><br>
  <sub><strong>Authly</strong> · Your codes. Your device.</sub>
</p>

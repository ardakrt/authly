# Authly

Authly is a Windows-first, offline desktop authenticator built with Electron, React, TypeScript, Vite, SQLite, and DPAPI OS-level encryption. It provides a secure, lightweight alternative to cloud-connected authenticator apps, keeping all multi-factor authentication (2FA/TOTP) secrets strictly local on your device.

## Features

- **RFC 6238 TOTP Generation**: Offline 6-digit dynamic passcode generator with real-time countdown progress.
- **Account Management**: Add accounts manually via secret keys, otpauth:// URIs, or scanning QR images.
- **Master PIN Security**: Protect app startup and sensitive account data with an encrypted Master PIN lock.
- **Encrypted Backup & Recovery**: Export and import full account backups protected with PBKDF2 + AES-256-GCM encryption.
- **System Tray & Hotkeys**: Minimize to Windows system tray, quick clipboard copy with auto-clipboard clear after 15 seconds.
- **Theme & Appearance**: System, dark, and light visual modes built with custom UI tokens and clean accessibility.
- **GitHub Release Update Check**: In-app one-click update checking against official GitHub releases.
- **Isolated Renderer Security**: Strict IPC sandboxing, custom uthapp:// protocol, zero raw Node/filesystem access in renderer.

## Privacy & Security

Authly is designed with a local-first security architecture:

- **Offline Operating Mode**: Secrets and database files never leave your computer.
- **OS-Level Safe Storage**: TOTP secrets are encrypted using Windows Data Protection API (DPAPI).
- **Auto-Clipboard Clean**: Copied 2FA codes are automatically wiped from system clipboard after 15 seconds.
- **Zero Analytics**: No telemetry, tracking, or cloud backend services.

## Requirements

- Windows 10/11 (x64)
- Node.js 20.19 or newer
- npm 11 or newer

## Setup

Install dependencies:

`ash
npm install
`

## Development

Run the Vite dev server and Electron app:

`ash
npm run dev
`

## Verification & Testing

Run full quality gates (formatting, linting, tests, strict TypeScript build, and visual/runtime smoke testing):

`powershell
npm run verify
`

Run individual quality checks:

`powershell
npm run typecheck
npm run lint
npm test
npm run build
npm run smoke
`

## Build & Distribution

Package the standalone Windows NSIS installer:

`powershell
npm run package:win
`

Installers and packaged outputs are generated in the dist/ directory.

## Local Data

Runtime data (SQLite database, encrypted Vault secrets, application settings) is stored locally in Windows %APPDATA%\authapp and is excluded from Git. Do not commit personal backups, local database files, or master PIN hashes.

## License

This project is licensed under the MIT License. See [LICENSE](./LICENSE).
